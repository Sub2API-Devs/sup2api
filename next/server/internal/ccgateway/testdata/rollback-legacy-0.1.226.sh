docker rm -f ccg-controller >/dev/null 2>&1
if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
    echo CCG_RESULT=restored; exit 0
  fi
  echo CCG_RESULT=restore_failed; exit 1
fi
echo CCG_RESULT=removed
