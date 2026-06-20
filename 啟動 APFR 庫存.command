#!/bin/bash
cd "$(dirname "$0")"
open "http://127.0.0.1:8787/apfr-inventory.html"
/usr/bin/ruby apfr_server.rb
