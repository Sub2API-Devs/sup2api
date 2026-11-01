DIR='/opt/ccgateway'
docker rm -f ccg-controller-prev >/dev/null 2>&1
rm -f "$DIR/.env.prev" "$DIR/.transition"
echo CCG_RESULT=done
