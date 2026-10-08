"""Image management for CCGateway controller.

Handles Docker image uploads and loading for account runtimes.
"""
import base64
import hashlib
import io
import os
import tarfile
import tempfile
from pathlib import Path
from typing import BinaryIO, Optional

import docker


class ImageUploadError(Exception):
    """镜像上传失败"""


def validate_image_name(name: str) -> bool:
    """验证镜像名称格式"""
    if not name or len(name) > 256:
        return False
    # 简单验证：repository[:tag][@digest]
    parts = name.split('@')
    if len(parts) > 2:
        return False
    repo_tag = parts[0]
    if ':' in repo_tag:
        repo, tag = repo_tag.rsplit(':', 1)
        if not repo or not tag or len(tag) > 128:
            return False
    return True


def calculate_sha256(data: BinaryIO) -> str:
    """计算数据的 SHA256 哈希"""
    sha = hashlib.sha256()
    while chunk := data.read(65536):
        sha.update(chunk)
    return sha.hexdigest()


class ImageManager:
    """管理 Docker 镜像的上传和加载"""

    def __init__(self, docker_client: docker.DockerClient, upload_dir: Path):
        self.docker = docker_client
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(mode=0o700, parents=True, exist_ok=True)

    def upload_image_data(self, image_name: str, image_data: BinaryIO, expected_sha256: Optional[str] = None) -> dict:
        """
        上传镜像数据到临时目录

        Args:
            image_name: 镜像名称（用于标识）
            image_data: 镜像 tar 数据流
            expected_sha256: 可选的预期 SHA256 哈希

        Returns:
            {"upload_id": str, "sha256": str, "size": int}

        Raises:
            ImageUploadError: 上传失败
        """
        if not validate_image_name(image_name):
            raise ImageUploadError('invalid image name')

        # 生成上传 ID
        upload_id = base64.urlsafe_b64encode(os.urandom(16)).decode('ascii').rstrip('=')
        upload_path = self.upload_dir / f"{upload_id}.tar"
        tmp_path = None

        try:
            # 写入临时文件并计算哈希
            with tempfile.NamedTemporaryFile(mode='wb', dir=self.upload_dir, delete=False, suffix='.tmp') as tmp:
                tmp_path = Path(tmp.name)
                sha = hashlib.sha256()
                size = 0

                while chunk := image_data.read(65536):
                    sha.update(chunk)
                    tmp.write(chunk)
                    size += len(chunk)
                    # 限制最大上传大小（2GB）
                    if size > 2 * 1024 * 1024 * 1024:
                        raise ImageUploadError('image too large')

                os.fsync(tmp.fileno())

            # 验证哈希（如果提供）
            actual_sha256 = sha.hexdigest()
            if expected_sha256 and actual_sha256 != expected_sha256:
                raise ImageUploadError('checksum mismatch')

            # 设置权限并移动到最终位置
            os.chmod(tmp_path, 0o600)
            tmp_path.replace(upload_path)
            tmp_path = None  # 已移动，不再需要清理

            return {
                'upload_id': upload_id,
                'sha256': actual_sha256,
                'size': size,
                'path': str(upload_path)
            }

        except Exception as e:
            # 清理
            if tmp_path and tmp_path.exists():
                tmp_path.unlink(missing_ok=True)
            upload_path.unlink(missing_ok=True)
            if isinstance(e, ImageUploadError):
                raise
            raise ImageUploadError(f'upload failed: {e}') from e

    def load_image(self, upload_id: str) -> dict:
        """
        从上传的文件加载镜像到 Docker

        Args:
            upload_id: 上传 ID

        Returns:
            {"image_id": str, "tags": list}

        Raises:
            ImageUploadError: 加载失败
        """
        upload_path = self.upload_dir / f"{upload_id}.tar"
        if not upload_path.exists():
            raise ImageUploadError('upload not found')

        try:
            # 加载镜像
            with open(upload_path, 'rb') as f:
                result = self.docker.images.load(f)

            # 提取镜像信息
            if not result:
                raise ImageUploadError('no image loaded')

            images = list(result)
            if not images:
                raise ImageUploadError('no image in archive')

            image = images[0]
            return {
                'image_id': image.id,
                'tags': image.tags,
                'short_id': image.short_id
            }

        except docker.errors.DockerException as e:
            raise ImageUploadError(f'docker load failed: {e}') from e
        finally:
            # 清理上传文件
            upload_path.unlink(missing_ok=True)

    def upload_and_load(self, image_name: str, image_data: BinaryIO, expected_sha256: Optional[str] = None) -> dict:
        """
        上传并立即加载镜像（组合操作）

        Returns:
            {"upload_id": str, "sha256": str, "size": int, "image_id": str, "tags": list}
        """
        upload_result = self.upload_image_data(image_name, image_data, expected_sha256)
        try:
            load_result = self.load_image(upload_result['upload_id'])
            return {**upload_result, **load_result}
        except Exception as e:
            # 清理失败的上传
            upload_path = self.upload_dir / f"{upload_result['upload_id']}.tar"
            upload_path.unlink(missing_ok=True)
            raise

    def cleanup_old_uploads(self, max_age_seconds: int = 3600):
        """清理超过指定时间的上传文件"""
        import time
        now = time.time()
        for path in self.upload_dir.glob('*.tar'):
            if now - path.stat().st_mtime > max_age_seconds:
                path.unlink(missing_ok=True)
