# frozen_string_literal: true

require "json"
require "open-uri"
require "time"
require "cgi"

NOTES_INDEX_URL = "https://www.apothekefragrance.jp/en/notes/"
EXCLUDED_SCENTS = ["OSMANTHUS"].freeze
APFR_TW_BASE_URL = "https://apothekefragrance.tw"

PRODUCTS = [
  ["洗手露", "https://www.everydayware.co/products/apotheke-fragrance-handwash"],
  ["室內擴香", "https://www.everydayware.co/products/apotheke-fragrance-reed-diffuser"],
  ["盒裝塔香", "https://www.everydayware.co/products/apotheke-fragrance-incense-cone-1"],
  ["線香", "https://www.everydayware.co/products/apotheke-fragrance-incense-sticks"],
  ["燃燒專用精油", "https://www.everydayware.co/products/apotheke-fragrance-fragrance-oil"],
  ["燃燒專用精油 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance--fragrance-oil"],
  ["室內擴香 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance-reed--diffuser"],
  ["旅遊罐裝蠟燭", "https://www.everydayware.co/products/apotheke-fragrance-travel-tin-candle"],
  ["空間噴霧", "https://www.everydayware.co/products/apotheke-fragrance-room-mist-spray"],
  ["衣櫥香氛吊卡", "https://www.everydayware.co/products/apotheke-fragrance-closet-tag"],
  ["玻璃罐裝蠟燭 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance-glass--jar--candle"],
  ["玻璃罐裝蠟燭", "https://www.everydayware.co/products/apotheke-fragrance-glass-jar-candle"]
].freeze

GOODS = [
  {
    label: "APFR 燭芯剪",
    url: "https://www.everydayware.co/products/apotheke-fragrance-wick-trimmer",
    image: "product-images/wick-trimmer.png",
    descriptionZh: "專為蠟燭日常保養設計。修剪燭芯能幫助燃燒更穩定，維持乾淨的燭火與香氣表現。"
  },
  {
    label: "APFR 精油燃燒台",
    url: "https://www.everydayware.co/products/fragrance-oil-burner",
    image: "product-images/oil-burner.png",
    descriptionZh: "將茶燭置於底部，加熱玻璃皿中的香氛精油，使香氣緩緩擴散。購買時附一個無味茶燭，可自行替換。"
  },
  {
    label: "APFR 黃銅線香座 / Holder",
    url: "https://www.everydayware.co/products/apotheke-frgarance-brass-incense-holder",
    image: "product-images/brass-incense-holder.png",
    descriptionZh: "APOTHEKE FRAGRANCE 黃銅線香盤，以全實心黃銅手工製作。簡潔的弧形設計，讓線香灰自然落在盤面上，隨使用時間呈現黃銅獨有的色澤變化。"
  },
  {
    label: "APFR 黃銅線香座 / Stand",
    url: "https://www.everydayware.co/products/apotheke-frgarance-brass-incense-stand",
    image: "product-images/brass-incense-stand.png",
    descriptionZh: "APOTHEKE FRAGRANCE 黃銅線香座，生產及設計皆來自日本雕塑家牧野永美子小姐。全程手工製作，沒有多餘的裝飾，線香灰將落在流暢的線條與曲面上，帶著香氣，造就寧靜典雅的完美空間。"
  }
].freeze

OFFICIAL_PRODUCT_IMAGES = {
  "洗手露" => "product-images/hand-wash.png",
  "室內擴香" => "product-images/reed-diffuser.png",
  "盒裝塔香" => "product-images/incense-cones.png",
  "線香" => "product-images/incense-sticks.png",
  "燃燒專用精油" => "product-images/fragrance-oil.png",
  "燃燒專用精油 舊包裝" => "product-images/fragrance-oil-old-baseline.png",
  "室內擴香 舊包裝" => "product-images/reed-diffuser-old.png",
  "旅遊罐裝蠟燭" => "product-images/travel-tin-candle.png",
  "空間噴霧" => "product-images/room-mist-spray.png",
  "衣櫥香氛吊卡" => "product-images/closet-tag.png",
  "玻璃罐裝蠟燭 舊包裝" => "product-images/fragrance-candle-old.png",
  "玻璃罐裝蠟燭" => "product-images/fragrance-candle.png"
}.freeze

APFR_TW_COLLECTIONS = {
  "洗手露" => "hand-wash",
  "室內擴香" => "reed-diffuser",
  "盒裝塔香" => "incense-cones",
  "線香" => "incense-sticks",
  "燃燒專用精油" => "fragrance-oil",
  "燃燒專用精油 舊包裝" => "fragrance-oil",
  "室內擴香 舊包裝" => "reed-diffuser",
  "旅遊罐裝蠟燭" => "travel-tin-candle",
  "空間噴霧" => "room-mist-spray",
  "衣櫥香氛吊卡" => "closet-tag",
  "玻璃罐裝蠟燭 舊包裝" => "fragrance-candle",
  "玻璃罐裝蠟燭" => "fragrance-candle"
}.freeze

SCENT_OVERRIDES = {
  "LAVENDER" => {
    "descriptionZh" => "甘甜不膩的花香調，配合草本的清爽。薰衣草以出色的抗菌效果而聞名。英文 Lavender 的詞根起源自拉丁語 LAVARE，有「洗滌」的意思。作為男性經典的 fougere（馥奇調）香調的主要成分，薰衣草突破性別界限，被世人推崇。",
    "notesZh" => "薰衣草 / 寬葉薰衣草"
  },
  "TOBACCO CEDAR" => {
    "descriptionZh" => "以煙卷的香味為靈感的東方木質香調。",
    "notesZh" => "煙葉 / 雪松 / 檀香 / 柑橘 / 辛香料 / 沈香木 / 肉桂 / 愈創木 / 黑胡椒 / 香根草"
  },
  "THE QUIET LIGHT" => {
    "descriptionZh" => "以夜晚靜默安逸的湖泊為靈感的綠色花香調。",
    "notesZh" => "佛手柑 / 酸橙 / 依蘭 / 百合 / 黃瓜 / 竹子"
  },
  "OAKMOSS & AMBER" => {
    "image" => "https://www.apothekefragrance.jp/wp/wp-content/uploads/2023/03/Oakmossamber-1000x1000.webp",
    "url" => "https://www.apothekefragrance.jp/en/notes/fragrance/oakmoss-amber/"
  },
  "EARL GREY & GRAPEFRUIT" => {
    "family" => "Citrus",
    "notes" => ["Bergamot", "Black Tea", "Grapefruit", "Lily", "Rose", "Tea", "Violet"],
    "description" => "A scent evoking Earl Grey tea. The relaxing aroma of bergamot features heavily in this scent.",
    "image" => "https://www.apothekefragrance.jp/wp/wp-content/uploads/2023/03/Eearl-Grey-Grapefruit-1000x1000.webp",
    "url" => "https://www.apothekefragrance.jp/en/notes/fragrance/earl-grey-grapefruit/",
    "descriptionZh" => "散發著伯爵茶的香味，佛手柑舒緩的香氣是這個香氛的主要特征。",
    "notesZh" => "葡萄柚 / 佛手柑 / 茶 / 玫瑰 / 紫羅蘭 / 百合 / 紅茶",
    "sourceZh" => "https://apothekefragrance.tw/zh/products/fragrance-oil-燃燒專用精油-earl-grey-grapefruit-1"
  }
}.freeze

PRODUCT_OVERRIDES = {
  "室內擴香 舊包裝" => {
    "specZh" => "日本製造 / 內容量 250mL / 擴香棒 5 pc / 留香期 5-6 個月"
  },
  "玻璃罐裝蠟燭 舊包裝" => {
    "specZh" => "Made in Japan / 內容量 290g / 大豆蠟 / 燃燒時間約 64 小時"
  }
}.freeze

def extract_product(html)
  raw = html[/app\.value\('product', JSON\.parse\('(.*?)'\)\);/m, 1]
  raise "找不到商品資料" unless raw

  JSON.parse(JSON.parse(%("#{raw}")))
end

def clean_scent(name)
  name.to_s
      .gsub(/[（(]\s*售完停產\s*[）)]/, "")
      .gsub(/[（(]\s*停產\s*[）)]/, "")
      .gsub(/GARPEFRUIT/i, "GRAPEFRUIT")
      .gsub(/\s*&\s*/, " & ")
      .strip
end

def accessory_variation?(name)
  text = name.to_s
  text.include?("擴香竹") || text.include?("禮品包裝")
end

def excluded_scent?(name)
  EXCLUDED_SCENTS.include?(clean_scent(name).upcase)
end

def variation_name(variation)
  variation.dig("fields", 0, "name") ||
    variation.dig("fields_translations", "zh-hant", 0) ||
    variation["key"]
end

def strip_tags(html)
  html.to_s
      .gsub(/<script.*?<\/script>/m, "")
      .gsub(/<style.*?<\/style>/m, "")
      .gsub(/<[^>]+>/, " ")
      .gsub(/\s+/, " ")
      .strip
end

def normalize_description(text)
  decoded = strip_tags(text)
  4.times do
    next_decoded = CGI.unescapeHTML(decoded)
    break if next_decoded == decoded

    decoded = next_decoded
  end
  decoded
    .gsub("\u00a0", " ")
    .gsub("＆", "&")
    .gsub(/\s+/, " ")
    .strip
end

def page_description(html)
  meta = html[/<meta name="description" content="(.*?)"/m, 1] ||
    html[/<meta property="og:description" content="(.*?)"/m, 1]
  normalize_description(meta.to_s)
end

def product_image(product)
  product.dig("media", 0, "images", "original", "url") ||
    product.dig("cover_media_array", 0, "original_image_url") ||
    product.dig("media", 0, "default_image_url") ||
    ""
end

def normalize_scent_key(name)
  clean_scent(name)
    .downcase
    .gsub("garpefruit", "grapefruit")
    .gsub(/\Athe\b/, "")
    .gsub(/[^a-z0-9]+/, "")
end

def scent_name_pattern_source(scent)
  name = scent.to_s.upcase.gsub("GARPEFRUIT", "GRAPEFRUIT")
  tokens = name.scan(/[A-Z0-9]+/)
  tokens.map { |token| Regexp.escape(token) }.join('\s*(?:[+&]|AND)?\s*')
end

def scent_entry_pattern(scent)
  /[‧•]\s*#{scent_name_pattern_source(scent)}(?!(?:\s|[+&])+[A-Z0-9])/i
end

def clean_everydayware_entry(entry, scent)
  text = normalize_description(entry)
  text = text.sub(/\A[‧•]\s*/u, "")
  text = text.sub(/\A#{scent_name_pattern_source(scent)}/i, "")
  text.gsub!(/NEW!|全球No\.?1|台灣區No\.?1/i, "")
  text.gsub!(/(?:AROMATIC|CITRUS|FLORAL|FRUITY|GREEN|WATER|WOODS|WOOD|LEATHER|ORIENTAL|SPICE|MUSK)\z/i, "")
  text.gsub!(/\s+/, " ")
  text.strip
end

def parse_everydayware_scent_info(sources, scent_names)
  result = {}
  sorted_scents = scent_names.sort_by { |scent| -scent.length }
  scent_patterns = sorted_scents.to_h { |scent| [scent, scent_entry_pattern(scent)] }

  sources.each do |text|
    next if text.to_s.empty?

    sorted_scents.each do |scent|
      match = text.match(scent_patterns[scent])
      next unless match

      next_match = scent_patterns.values.map { |pattern| text.match(pattern, match.end(0)) }
                                .compact
                                .min_by { |candidate| candidate.begin(0) }
      generic_next_match = text.match(/[‧•]\s*[A-Z0-9]/, match.end(0))
      if generic_next_match && (!next_match || generic_next_match.begin(0) < next_match.begin(0))
        next_match = generic_next_match
      end
      raw_entry = text[match.begin(0)...(next_match ? next_match.begin(0) : text.length)]
      entry = clean_everydayware_entry(raw_entry, scent)
      next if entry.empty?

      current = result[scent]
      if current.nil? || entry.length > current["descriptionZh"].to_s.length
        result[scent] = {
          "descriptionZh" => entry,
          "notesZh" => entry.split(/[。；;]/).first.to_s.strip
        }
      end
    end
  end

  result
end

def product_scent_from_tw_title(title)
  title.to_s.split("/").last.to_s.strip
end

def html_paragraphs(html)
  prepared = html.to_s.gsub(/<br\b[^>]*>/i, "\n")
  paragraphs = prepared.scan(/<(?:p|div)\b[^>]*>(.*?)<\/(?:p|div)>/mi).flatten
  paragraphs = [html] if paragraphs.empty?
  paragraphs.flat_map do |paragraph|
    paragraph.split("\n")
             .map { |line| normalize_description(line) }
  end.reject(&:empty?)
end

def chinese_text?(text)
  text.to_s.match?(/[\u4e00-\u9fff]/)
end

def spec_paragraph?(text)
  text.to_s.match?(/日本製|產地/) &&
    text.match?(/容量|內容量|內容物|燃燒時間|本體尺寸|瓶身尺寸|外盒尺寸|擴香棒|尺寸|香味期限/)
end

def spec_line?(text)
  text.to_s.match?(/日本製|產地|容量|內容量|內容物|燃燒時間|本體尺寸|瓶身尺寸|外盒尺寸|尺寸|香味期限|材質/)
end

def notes_paragraph?(text)
  value = text.to_s
  chinese_text?(value) &&
    value.include?("/") &&
    !spec_paragraph?(value) &&
    !value.include?("Organic") &&
    value.length <= 260
end

def scent_title_paragraph?(text)
  value = text.to_s
  chinese_text?(value) &&
    value.length <= 36 &&
    !value.include?("/") &&
    !value.include?("。") &&
    !value.include?("【") &&
    !value.start_with?("●")
end

def clean_product_description(paragraphs)
  paragraphs.find do |paragraph|
    chinese_text?(paragraph) &&
      !paragraph.include?("【") &&
      !paragraph.start_with?("●") &&
      !spec_paragraph?(paragraph)
  end.to_s
end

def dimension_spec_part?(part)
  value = part.to_s
  value.include?("尺寸") ||
    value.match?(/\b[HWDL]\s*\d/i) ||
    value.match?(/\d+\s*mm/i)
end

def clean_product_spec(spec)
  parts = spec.to_s.split(/\s+\/\s+/)
  cleaned = []

  until parts.empty?
    part = parts.shift.to_s.strip
    if part.start_with?("材質")
      break
    end

    next if dimension_spec_part?(part)

    cleaned << part unless part.empty?
  end

  cleaned.join(" / ")
    .gsub("產地：JAPAN", "Made in Japan")
    .gsub("日本製造", "Made in Japan")
    .gsub("日本製", "Made in Japan")
end

def parse_tw_product_body(body_html)
  paragraphs = html_paragraphs(body_html)
  spec_index = paragraphs.index { |paragraph| spec_paragraph?(paragraph) }
  spec = spec_index ? paragraphs[spec_index] : ""
  unless spec_index
    spec_start = paragraphs.index { |paragraph| paragraph.match?(/日本製|產地/) }
    if spec_start
      spec_lines = paragraphs[spec_start..].take_while do |paragraph|
        paragraph != "-" && spec_line?(paragraph) && !paragraph.match?(/\A[A-Z][A-Za-z ]+:/)
      end
      spec = spec_lines.join(" / ")
      spec_index = spec_start unless spec.empty?
    end
  end

  before_spec = spec_index ? paragraphs[0...spec_index] : paragraphs
  notes_index = before_spec.rindex { |paragraph| notes_paragraph?(paragraph) }
  title_index = if notes_index
                  before_spec[0...notes_index].rindex { |paragraph| scent_title_paragraph?(paragraph) }
                else
                  before_spec.rindex { |paragraph| scent_title_paragraph?(paragraph) }
                end

  description_range_end = notes_index || before_spec.length
  description = if title_index
                  before_spec[(title_index + 1)...description_range_end]
                    .select { |paragraph| chinese_text?(paragraph) }
                    .reject { |paragraph| paragraph.start_with?("●") || paragraph.include?("【") }
                    .join(" ")
                else
                  ""
                end

  product_description = clean_product_description(title_index ? before_spec[0...title_index] : before_spec)
  notes = notes_index ? before_spec[notes_index].gsub(/[()（）]/, "").strip : ""

  {
    "productDescriptionZh" => product_description,
    "productSpecZh" => clean_product_spec(spec),
    "descriptionZh" => description,
    "notesZh" => notes
  }
end

def fetch_apfr_tw_product_data
  result = {
    productInfo: {},
    scentInfo: {}
  }

  APFR_TW_COLLECTIONS.each do |label, collection|
    next if result[:productInfo].key?(label) && APFR_TW_COLLECTIONS.values.count(collection) > 1

    url = "#{APFR_TW_BASE_URL}/zh/collections/#{collection}/products.json?limit=250"
    warn "讀取 APFR TW #{label}"
    products = JSON.parse(URI.open(url, "User-Agent" => "Mozilla/5.0").read).fetch("products", [])

    first_info = nil
    products.each do |product|
      scent = product_scent_from_tw_title(product["title"])
      next if scent.empty? || excluded_scent?(scent)

      info = parse_tw_product_body(product["body_html"])
      first_info ||= info

      scent_key = normalize_scent_key(scent)
      result[:scentInfo][scent_key] ||= {}
      current = result[:scentInfo][scent_key]
      if info["descriptionZh"].to_s.length > current["descriptionZh"].to_s.length
        current["descriptionZh"] = info["descriptionZh"]
        current["sourceZh"] = "#{APFR_TW_BASE_URL}/zh/products/#{product["handle"]}"
      end
      current["notesZh"] = info["notesZh"] if info["notesZh"].to_s.length > current["notesZh"].to_s.length
    end

    if first_info
      result[:productInfo][label] = {
        "descriptionZh" => first_info["productDescriptionZh"],
        "specZh" => first_info["productSpecZh"],
        "sourceZh" => "#{APFR_TW_BASE_URL}/zh/collections/#{collection}"
      }
    end
  rescue StandardError => e
    warn "略過 APFR TW #{label}: #{e.message}"
  end

  result
end

def note_links
  html = URI.open(NOTES_INDEX_URL, "User-Agent" => "Mozilla/5.0").read.force_encoding("UTF-8")
  html.scan(%r{<a href="(https://www\.apothekefragrance\.jp/en/notes/fragrance/[^"]+/)">\s*(.*?)\s*</a>}m)
      .map { |url, name| [normalize_scent_key(strip_tags(name)), url] }
      .to_h
end

def fetch_scent_info(scent_names)
  links = note_links
  scent_names.each_with_object({}) do |scent, result|
    url = links[normalize_scent_key(scent)]
    next unless url

    html = URI.open(url, "User-Agent" => "Mozilla/5.0").read.force_encoding("UTF-8")
    family = strip_tags(html[/<div id="family">.*?<dd>(.*?)<\/dd>/m, 1])
    notes_html = html[/<div id="notes">.*?<dd>(.*?)<\/dd>/m, 1].to_s
    notes = notes_html.scan(/<li>(.*?)<\/li>/m).flatten.map { |note| strip_tags(note).sub(/,\z/, "") }
    description = strip_tags(html[/<div id="description">(.*?)<\/div>/m, 1])
    image = html[/--thumbnail-url:\s*url\((.*?)\)/, 1].to_s

    result[scent] = {
      "family" => family,
      "notes" => notes,
      "description" => description,
      "image" => image,
      "url" => url
    }
  rescue StandardError => e
    warn "略過香氣介紹 #{scent}: #{e.message}"
  end
end

items = PRODUCTS.flat_map do |label, url|
  warn "讀取 #{label}"
  html = URI.open(url, "User-Agent" => "Mozilla/5.0").read.force_encoding("UTF-8")
  product = extract_product(html)
  variations = product["variations"] || []
  image = OFFICIAL_PRODUCT_IMAGES[label] || product_image(product)

  if variations.empty?
    [{
      id: product["_id"],
      productLabel: label,
      productTitle: product.dig("title_translations", "zh-hant") || label,
      scent: label,
      rawScent: label,
      quantity: product["quantity"].to_i,
      soldOut: product["sold_out"] || product["quantity"].to_i <= 0,
      price: product.dig("price", "label"),
      productImage: image,
      url: url
    }]
  else
    variations.each_with_object([]) do |variation, records|
      raw_scent = variation_name(variation).to_s
      next if accessory_variation?(raw_scent)
      next if excluded_scent?(raw_scent)

      quantity = variation["quantity"].to_i
      records << {
        id: "#{product["_id"]}:#{variation["key"] || variation["stock_id"]}",
        productLabel: label,
        productTitle: product.dig("title_translations", "zh-hant") || label,
        scent: clean_scent(raw_scent),
        rawScent: raw_scent,
        quantity: quantity,
        soldOut: product["sold_out"] || quantity <= 0,
        price: variation.dig("price", "label") || product.dig("price", "label"),
        productImage: image,
        url: url
      }
    end
  end
rescue StandardError => e
  warn "略過 #{label}: #{e.message}"
  []
end

goods = GOODS.map do |good|
  warn "讀取 #{good[:label]}"
  html = URI.open(good[:url], "User-Agent" => "Mozilla/5.0").read.force_encoding("UTF-8")
  product = extract_product(html)
  variations = product["variations"] || []
  quantity = if variations.empty?
               product["quantity"].to_i
             else
               variations.inject(0) { |total, variation| total + variation["quantity"].to_i }
             end

  {
    id: product["_id"],
    label: good[:label],
    title: product.dig("title_translations", "zh-hant") || good[:label],
    descriptionZh: good[:descriptionZh],
    quantity: quantity,
    soldOut: product["sold_out"] || quantity <= 0,
    price: product.dig("price", "label"),
    image: good[:image] || product_image(product),
    url: good[:url]
  }
rescue StandardError => e
  warn "略過 #{good[:label]}: #{e.message}"
  nil
end.compact

warn "讀取 APFR 官方香氣介紹"
scent_info = fetch_scent_info(items.map { |item| item[:scent] }.uniq)
warn "讀取 APFR TW 中文香氣與品項介紹"
tw_data = fetch_apfr_tw_product_data

PRODUCT_OVERRIDES.each do |label, info|
  tw_data[:productInfo][label] ||= {}
  tw_data[:productInfo][label].merge!(info)
end

tw_data[:productInfo].each_value do |info|
  info["specZh"] = info["specZh"].to_s
    .gsub("產地：JAPAN", "Made in Japan")
    .gsub("日本製造", "Made in Japan")
    .gsub("日本製", "Made in Japan")
end

items.each do |item|
  product_info = tw_data[:productInfo][item[:productLabel]]
  next unless product_info

  item[:productDescriptionZh] = product_info["descriptionZh"]
  item[:productSpecZh] = product_info["specZh"]
  item[:productInfoSource] = product_info["sourceZh"]
end

items.map { |item| item[:scent] }.uniq.each do |scent|
  info = tw_data[:scentInfo][normalize_scent_key(scent)]
  next unless info

  scent_info[scent] ||= {}
  scent_info[scent].merge!(info)
end

SCENT_OVERRIDES.each do |scent, info|
  scent_info[scent] ||= {}
  scent_info[scent].merge!(info)
end

payload = {
  updatedAt: Time.now.strftime("%Y-%m-%d %H:%M"),
  sourceCount: PRODUCTS.length,
  scentInfo: scent_info,
  productInfo: tw_data[:productInfo],
  goods: goods,
  items: items
}

File.write(
  File.join(__dir__, "inventory-data.js"),
  "window.APFR_INVENTORY_DATA = #{JSON.pretty_generate(payload)};\n"
)

puts "完成：#{items.length} 筆香氣/品項庫存組合"
