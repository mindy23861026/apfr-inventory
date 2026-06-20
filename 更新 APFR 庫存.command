#!/bin/bash
cd "$(dirname "$0")"
/usr/bin/ruby sync_inventory.rb
echo
echo "完成後請重新整理 apfr-inventory.html"
read -n 1 -s -r -p "按任意鍵關閉"
