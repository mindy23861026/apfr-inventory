# frozen_string_literal: true

require "json"
require "socket"
require "webrick"

ROOT = File.expand_path(__dir__)
PORT = 8787
SYNC_INTERVAL = 15 * 60
SYNC_LOCK = Mutex.new
$stdout.sync = true

def local_network_addresses
  Socket.ip_address_list.map(&:ip_address).select do |address|
    address.match?(%r{\A10\.|\A192\.168\.|\A172\.(?:1[6-9]|2\d|3[0-1])\.})
  end.uniq
end

def inventory_payload
  text = File.binread(File.join(ROOT, "inventory-data.js")).force_encoding("UTF-8")
  JSON.parse(text[/\{.*\}/m])
end

def sync_inventory
  SYNC_LOCK.synchronize do
    puts "[#{Time.now.strftime('%H:%M')}] 正在同步 Everydayware 庫存..."
    success = system("/usr/bin/ruby", File.join(ROOT, "sync_inventory.rb"), chdir: ROOT)
    puts(success ? "同步完成，下一次同步將在 15 分鐘後。" : "同步失敗，15 分鐘後將再次嘗試。")
    success
  end
end

server = WEBrick::HTTPServer.new(
  BindAddress: "0.0.0.0",
  DocumentRoot: ROOT,
  Port: PORT,
  AccessLog: [],
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::INFO)
)

server.mount_proc "/api/sync" do |_request, response|
  response["Content-Type"] = "application/json; charset=utf-8"

  success = sync_inventory

  if success
    response.status = 200
    response.body = JSON.generate(inventory_payload)
  else
    response.status = 500
    response.body = JSON.generate(error: "同步失敗，請查看啟動視窗訊息。")
  end
rescue StandardError => e
  response.status = 500
  response.body = JSON.generate(error: e.message)
end

auto_sync_thread = Thread.new do
  loop do
    sync_inventory
    sleep SYNC_INTERVAL
  end
end

trap("INT") do
  auto_sync_thread.kill
  server.shutdown
end

puts "APFR 庫存頁已啟動： http://127.0.0.1:#{PORT}/apfr-inventory.html"
local_network_addresses.each do |address|
  puts "客人瀏覽網址： http://#{address}:#{PORT}/customer-inventory.html"
  puts "管理頁網址： http://#{address}:#{PORT}/apfr-inventory.html"
end
puts "已啟用每 15 分鐘自動同步。請讓平板與其他電腦連到相同 Wi-Fi，並保持這個視窗開著。"

server.start
