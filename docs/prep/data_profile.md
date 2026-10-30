**EINSTEIN公開合成データの事前調査（2026年10月30日）**

この資料はデータ理解のための調査であり、ハッカソン提出用のマッチメーカー、エージェントシステム、提案書は作成していない。研究者1,047レコード、企業153社、課題489件という規模はREADMEと一致した。重要なのは、略歴欠落60件、論文要旨欠落640件、同一人物の表記違い候補4組、同姓同名2組があり、検索結果をそのまま共同研究相手の推薦にできない点である。

READMEを最初に読み、公開リポジトリを `scratch/einstein-matchmaker-data/` にcloneした。対象はcommit **`4fb99b3749adf0d10b5977089ff4c73f4f522240`**、JSONメタデータのversionは **2.0**。以下の機械集計はこの固定スナップショットに対する全件検査であり、意味判断は明示した手動基準による。人物・企業・論文・プロジェクト・特許は架空であり、実在の専門家の評価ではない。[固定版README](https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/4fb99b3749adf0d10b5977089ff4c73f4f522240/README.md)

開始時刻は主催者イベントページのFAQに金曜10月30日10:00 CETと記載され、JSTでは同日18:00に相当する。日程表の10:00のラベルは「開場」。なお、取得時のトラック本文は提出締切を10月31日20:00 CET、検索インデックスと公開ルールは14:00 CETと表示しており、公開情報に不一致がある。本資料では締切を確定しない。取得したトラック本文を `scratch/track.txt` と `track.html` に保存した。[イベントページ](https://jigjoy.ai/hackathon-2026)、[EINSTEINトラック](https://jigjoy.ai/tracks/einstein)、[公開ルール](https://build.jigjoy.ai/rules)

まず、ファイルのレコード数を示す。CSVはヘッダーを除く論理行数、JSONLは空行を除くオブジェクト数、JSONはルート配下の配列長で数えた。CSV内の改行を通常の行数として数えてはいけない。データ8ファイルの合計は **31,660,521 bytes**（約31.66 MB、30.19 MiB）。CSVはJSONの派生表なので、両方を足して人物・企業を二重に数えない。[対象dataディレクトリ](https://github.com/jigjoy-ai/einstein-matchmaker-data/tree/4fb99b3749adf0d10b5977089ff4c73f4f522240/data)

| ファイル | レコード数 | bytes |
|---|---:|---:|
| `companies.csv` | 153 | 563,393 |
| `companies.json` | 153 | 1,210,164 |
| `company-pages.jsonl` | 917 | 1,688,965 |
| `patents.json` | 111 | 108,527 |
| `projects.json` | 1,823 | 2,555,742 |
| `publications.jsonl` | 10,779 | 19,590,668 |
| `researchers.csv` | 1,047 | 2,686,984 |
| `researchers.json` | 1,047 | 3,256,078 |

`companies.json` の `challenges[]` は別ファイルではなく、153社に内包された489件。1課題の会社5社、2課題19社、3課題70社、4課題59社で、5＋38＋210＋236＝489となる。データ以外の追跡ファイルはREADME.md、.gitignore、docs/apis.md、docs/example-industrial-phd-topic.mdの4本（文書・設定でありレコード数の対象外）。

各フィールドの空欄は、キー欠落、null、空文字／空白だけの文字列、空配列を区別した。以下の「空」は空文字または空配列の件数。0件のフィールドは同じセルに列挙するが、**列挙した各フィールドがそれぞれ0件**という意味である。全ての既存スキーマでキー欠落は0、nullは論文著者のresearcher_id以外0だった。

| ファイル・対象（分母） | フィールド | 空の件数 | nullの件数 |
|---|---|---:|---:|
| `researchers.json`（1,047） | `id`, `name`, `title`, `institution`, `faculty`, `department`, `keywords`, `language` | 各0 | 各0 |
| `researchers.json`（1,047） | `fields` | 1 | 0 |
| `researchers.json`（1,047） | `bio` | 60 | 0 |
| `researchers.json`（1,047） | `publications` | 2 | 0 |
| `researchers.json`（1,047） | `projects` | 23 | 0 |
| `researchers.json`（1,047） | `patents` | 936 | 0 |
| `researchers.json`（1,047） | `open_to` | 5 | 0 |
| `researchers.json`（1,047） | `industry_experience` | 52 | 0 |
| `researchers.json`（1,047） | `notes` | 37 | 0 |
| `publications.jsonl`（10,779） | `id`, `title`, `year`, `venue`, `type`, `authors` | 各0 | 各0 |
| `publications.jsonl`（10,779） | `abstract` | 640 | 0 |
| `publications.jsonl`（10,779） | `keywords` | 75 | 0 |
| `publications.jsonl`.authors[]（38,442） | `name`, `affiliation` | 各0 | 各0 |
| `publications.jsonl`.authors[]（38,442） | `researcher_id` | 0 | 24,142 |
| `projects.json`（1,823） | `id`, `title`, `programme`, `years`, `summary`, `participants` | 各0 | 各0 |
| `projects.json`（1,823） | `acronym` | 19 | 0 |
| `projects.json`（1,823） | `partners` | 18 | 0 |
| `projects.json`.participants[]（2,876） | `researcher_id`, `role` | 各0 | 各0 |
| `patents.json`（111） | `id`, `title`, `year`, `status`, `inventors` | 各0 | 各0 |
| `patents.json`（111） | `abstract` | 4 | 0 |
| `patents.json`.inventors[]（111） | `researcher_id`, `name` | 各0 | 各0 |
| `companies.json`（153） | `id`, `name`, `sector`, `employees`, `founded`, `location`, `about`, `products`, `tech`, `challenges`, `plans`, `rd_capacity`, `past_collaborations`, `language` | 各0 | 各0 |
| `companies.json`.challenges[]（489） | `id`, `text`, `detail` | 各0 | 各0 |
| `company-pages.jsonl`（917） | `company_id`, `kind`, `title`, `date`, `text` | 各0 | 各0 |
| `researchers.csv`（1,047） | `id`, `name`, `title`, `faculty`, `department`, `keywords`, `language` | 各0 | 各0 |
| `researchers.csv`（1,047） | `fields` | 1 | 0 |
| `researchers.csv`（1,047） | `publications` | 2 | 0 |
| `researchers.csv`（1,047） | `projects` | 23 | 0 |
| `researchers.csv`（1,047） | `patents` | 936 | 0 |
| `researchers.csv`（1,047） | `open_to` | 5 | 0 |
| `researchers.csv`（1,047） | `industry_experience` | 52 | 0 |
| `researchers.csv`（1,047） | `notes` | 37 | 0 |
| `researchers.csv`（1,047） | `bio` | 60 | 0 |
| `companies.csv`（153） | `id`, `name`, `sector`, `employees`, `founded`, `location`, `products`, `tech`, `challenges`, `plans`, `rd_capacity`, `past_collaborations`, `language`, `about` | 各0 | 各0 |

JSONの4ファイル（researchers、companies、projects、patents）のルートは `name`、`version`、`note` と、同名のレコード配列。各ルート項目の空欄はそれぞれ0/1。配列フィールドは上表の行数が分母で、配列内部の著者・参加者等は別分母とした。配列要素は、著者・参加者・発明者・課題がオブジェクト、それ以外のfields/keywords/partners等は文字列。年・従業員数はJSONでは整数、projects.yearsとページdateは文字列、CSVは全列文字列。空配列は「情報未収録」と「該当なし」を区別できない。例えば特許なし936件を欠陥とは断定しない。`None.`のような文字列は構造上の空欄には含めない。

CSVはUTF-8 BOM付き。`utf-8-sig`で読む必要があり、単にUTF-8で読むと先頭列名が不可視文字付きの `id` になる。研究者CSVは `institution` を省略、配列を `; ` で平坦化。企業CSVの課題は `ID: text` を ` | ` で連結し、**detailを落とす**。この仕様で全セルをJSONから再構成すると両CSVとも相違0件だった。企業課題の条件・資源・失敗経験を調べるにはJSONを使う。

IDと結合を確認した結果は次の通り。形式違反・同一ファイル内の重複IDは全て0件で、数字部分は記載範囲内で連番だった。企業ページだけは独自のIDがない。

| 対象 | 正規表現 | 実際の範囲・結合先 |
|---|---|---|
| 研究者 | `^R[0-9]{4}$` | R0001–R1047 |
| 企業 | `^C[0-9]{3}$` | C001–C153 |
| 課題 | `^C[0-9]{3}-CH[1-4]$` | 489個すべて一意、接頭辞は親企業IDと一致 |
| 論文 | `^SYN-PUB-[0-9]{5}$` | SYN-PUB-00001–SYN-PUB-10779 |
| プロジェクト | `^SYN-PRJ-[0-9]{4}$` | SYN-PRJ-0001–SYN-PRJ-1823 |
| 特許 | `^SYN-PAT-[0-9]{3}$` | SYN-PAT-001–SYN-PAT-111 |
| 企業ページ | 独自IDなし | `company_id`→企業ID。引用箇所はcommit＋JSONL行番号も記録する |

研究者の `publications[]`、`projects[]`、`patents[]` は各ファイルの `id` への参照である。逆向きには論文の `authors[].researcher_id`、プロジェクトの `participants[].researcher_id`、特許の `inventors[].researcher_id` を使う。論文・プロジェクトは多対多。特許は今回の実データでは各1人の発明者だけが紐づく。企業課題は親企業への包含関係、企業ページは `company_id` で多対一。企業と研究者を結ぶ公式の正解ペア表はない。

| 関係 | 研究者側の辺数 | 成果側の辺数 | 存在しない参照先 | 研究者側だけにある辺 |
|---|---:|---:|---:|---:|
| 研究者–論文 | 14,310 | 14,300 | 0 | 10 |
| 研究者–プロジェクト | 2,876 | 2,876 | 0 | 0 |
| 研究者–特許 | 111 | 111 | 0 | 0 |

逆方向だけの辺は全て0件。全成果に少なくとも1人の有効な研究者IDがあり、ページ917件の企業参照も全て有効だった。著者38,442エントリ中24,142件（62.80%）の `researcher_id=null` はプロフィールに結び付いていない著者であり、架空の新IDを付けて補完してはならない。さらに、IDなし著者の名前をアクセント除去・小文字化・đ→djで正規化すると、**812著者エントリ**が既存研究者の名前と一致する。これは同一人物の証拠でも、812人という人数でもない。

READMEが挙げる「汚れ」を、再現できる定義で測ると次のようになる。例示欄はIDだけにした。機械的に確定できる件数と、文脈に依存する手動判定を混ぜて「真の総数」としない。

| 項目 | 件数・母数と判定基準 | 例示ID（原則3件） |
|---|---|---|
| 略歴なし | `bio`空文字60/1,047（5.73%） | R0015, R0020, R0039 |
| 論文要旨なし | `abstract`空文字640/10,779（5.94%） | SYN-PUB-00009, SYN-PUB-00011, SYN-PUB-00020 |
| 特許要旨なし | `abstract`空文字4/111（3.60%） | SYN-PAT-001, SYN-PAT-002, SYN-PAT-003 |
| キーワードだけの専門情報 | bio・fields・publications・projects・patentsが空でkeywordsのみある1/1,047 | R0607 |
| セルビア語研究者プロフィール | language=`sr`58件、`sr-Cyrl`24件、計82/1,047（7.83%）。srは文字体系の厳密指定ではない | R0009, R0018, R0021 |
| キリル文字指定プロフィール | language=`sr-Cyrl`24/1,047（2.29%） | R0002, R0025, R0131 |
| セルビア語企業プロフィール | language=`sr`26/153（16.99%）、`sr-Cyrl`0 | C004, C017, C021 |
| 同一人物の別表記候補 | 不一致の論文参照＋専門の一致で4組、8プロフィール。確定統合はしない | R0139, R0556, R0614 |
| 別人物の同姓同名 | 完全一致の名前が2組、4プロフィール。専門・所属・成果が異なる | R0128, R0191, R0881 |
| 退職・離籍による要更新 | title/notesで退職・emeritus20件、離籍明記1件、計21/1,047（2.01%） | R0068, R0079, R0090 |
| 現文では研究課題ではない候補 | 全489件の要求文を対象に、下記基準で手動抽出104件（21.27%）。主催者の正解ラベルではない | C002-CH3, C006-CH2, C137-CH3 |
| 良い共同研究マッチを提示できない精読例 | 3件を確認した下限。分野の根拠不足1件＋資金融通・採用目的2件。489件全体の確定総数は不明 | C101-CH1, C037-CH2, C137-CH3 |

キーワードだけの条件を満たすレコードは1件なので、3例に水増ししない。R0015は略歴・成果がないがfieldsがあるため別扱いで、成果なし研究者はこの2件である。同姓同名も2組しかないため、全組を下に示す。

言語タグと文字体系は一致しきらない。`bio+notes+industry_experience` にU+0400–U+04FFの文字を含む研究者は25件で、うち22件がsr-Cyrl、3件はsr（R0264、R0289、R0661）。sr-Cyrlの残り2件はこの対象欄にキリル文字がない。上表のラテン文字例は実際のbioを確認した。sr=ラテン文字と機械的に断定してはいけない。

タグのないファイルでは、本文の言語を文字だけで完全分類できないため、次表は**キリル文字を1文字以上含むレコード数**として報告する。セルビア語の確定総数ではない。ラテン文字の人名やアクセントだけで英文をセルビア語に分類する方法も採用していない。

| 対象欄 | キリル文字あり | 例示ID |
|---|---:|---|
| 研究者 bio/notes/industry_experience | 25 | R0002, R0025, R0131 |
| 企業 about | 0 | — |
| 論文 title/abstract | 45 | SYN-PUB-00014, SYN-PUB-00020, SYN-PUB-00071 |
| プロジェクト title/summary | 36 | SYN-PRJ-0102, SYN-PRJ-0103, SYN-PRJ-0276 |
| 特許 title/abstract | 0 | — |
| 企業ページ title/text | 16 | C009, C027, C041 |

ページ例は親企業IDでありページ固有IDではない。企業のaboutがラテン文字でも、その企業のページが同じ文字体系とは限らない。ラテン文字のセルビア語課題C054-CH2は、後述の検索実験でも実際に失敗した。

同一人物候補4組の内訳は、姓名順の逆転、イニシャル化、キリル／ラテン文字の違いである。各組は共通の論文IDを持つが、論文側の著者IDは片方だけを指す。共著者間でも論文を共有するので、この条件だけによる自動統合は避ける。

| 候補ID対 | 表記差 | 研究者側だけにある論文参照数 |
|---|---|---:|
| R0139 ↔ R0539 | 姓名順 | 3 |
| R0556 ↔ R0976 | キリル文字とラテン文字、別ソースとのnotes | 1 |
| R0614 ↔ R0637 | イニシャルとフルネーム | 3 |
| R0894 ↔ R0929 | キリル文字とラテン文字 | 3 |

一方、完全同名のR0128/R0881は食品の封入・脂質酸化と園芸・果実成分、R0191/R0435は医学画像と分析化学・センサーという別のプロフィールである。名前のアクセントを落とすだけでは上記4組の統合はできず、同名2組の誤統合を招く。論文側に有効IDがある著者についてはプロフィール名との文字列不一致0件だった。表記揺れは主に重複プロフィールとして現れている。[研究者データ](https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/4fb99b3749adf0d10b5977089ff4c73f4f522240/data/researchers.json)

「古いプロフィール」は年数だけで判定していない。20件の退職者には相談業務だけ可能というケースがあり、退職=一切協力不可ではない。明示的にプロフィール未更新と書かれた離籍者はR0068の1件だけ。21件は現在の所属・役割・稼働を再確認すべき集合であり、全員の記述が誤っているという意味ではない。企業ページの日付は2023-08-30～2024-11-12で、2026年の意思・設備稼働・採用状況を証明するには古い。企業の将来計画にも2024/2025年の予定が残る。

非研究候補104件の基準は「要求する成果が資金供給、採用、契約・申請処理、通常の導入・研修であり、現文のままでは研究上の不確実性を検証することを求めていない」。自然科学以外を除外する基準ではない。法学の比較研究、HR施策の効果検証、心理尺度の妥当性検証などは研究になり得る。未抽出の385件を「研究課題である」と全件認定したわけでもない。単一評価者の手動分類で、境界例には再評価余地がある。全104件のIDと分類は `scratch/annotations.json` に残した。

| 主目的 | 抽出数 | 例示ID |
|---|---:|---|
| 資金・投資・財務書類・助成申請 | 26 | C002-CH3, C003-CH3, C037-CH2 |
| 法務・契約・認証登録の実務 | 58 | C004-CH4, C006-CH2, C011-CH2 |
| 採用・人員不足 | 16 | C038-CH4, C045-CH2, C137-CH3 |
| 既成業務の導入・研修 | 4 | C049-CH1, C059-CH3, C064-CH3 |

C073-CH2の説明責任資料やC117-CH2の安全認証などは、現状では書類・プロセス実務と判定したが、未解決の検証方法が具体化されれば研究側へ移る。「規制」という単語だけで落とすべきではない。

「良いマッチなし」と「検索で見つからない」も区別する。C101-CH1の要件は分子シミュレーション用の量子回路の誤差緩和であり、量子暗号・量子光学の研究者がいることだけでは適合しない。全研究者・論文・プロジェクト・特許を対象にqubit、quantum error、zero-noise extrapolation、variational quantum、Qiskit、millihartreeも検索したが、直接対応する研究成果の根拠は見つからなかった。拾われたQubitはDNA測定機器の名称という誤一致だった。この**研究分野の不足を確認できた例は1件**であり、同種の例を3件捏造しない。残るC037-CH2、C137-CH3はそれぞれ在庫購入融資と常勤技術者の採用が主目的で、研究者の業績から依頼の充足を証明できない例として数えた。この3件と非研究候補104件は重なり得る分類で、足し合わせない。

489課題の業種分布には64種類の生のsectorラベルがある。次表は語形の異なるラベルを勝手に統合せず、企業sectorを各課題へ継承した厳密集計である。最大はEU向け受託ソフトウェア40件、農業技術30件、医療・デジタルヘルス26件。細分ラベルを合算する前でもこの3群で96件（19.63%）ある。

| sector（原文ラベル） | 企業数 | 課題数 |
|---|---:|---:|
| Custom software and IT services for EU clients | 12 | 40 |
| Agri-tech (farm software, sensing, drones) | 9 | 30 |
| Medtech and digital health | 8 | 26 |
| Energy, solar and grid services | 7 | 23 |
| IoT and electronics hardware | 6 | 22 |
| AI and data consultancies | 6 | 21 |
| Logistics, transport and e-commerce | 6 | 21 |
| Robotics and industrial automation | 6 | 21 |
| Food production and food tech | 6 | 20 |
| Marketing tech, media and creative studios | 5 | 17 |
| Automotive and mobility software | 5 | 16 |
| Biotech, diagnostics and lab services | 5 | 16 |
| Cybersecurity | 5 | 16 |
| Game development | 5 | 16 |
| Tourism, sport and wellness tech | 4 | 14 |
| Edtech | 4 | 13 |
| Pharma, cosmetics and chemicals | 4 | 13 |
| Legal tech | 2 | 8 |
| Textiles and fashion | 2 | 8 |
| Fintech | 2 | 6 |
| Cleantech — electric waste logistics and e-waste processing | 1 | 4 |
| Cleantech, recycling and water | 1 | 4 |
| Construction, proptech and geospatial | 1 | 4 |
| HR tech | 1 | 4 |
| Insurtech | 1 | 4 |
| Insurtech — embedded micro-insurance and parametric products | 1 | 4 |
| Manufacturing (metal) | 1 | 4 |
| Manufacturing (plastics, packaging) | 1 | 4 |
| Manufacturing – aluminium extrusion, cutting and surface finishing (anodising, powder coating) | 1 | 4 |
| Manufacturing – flexible plastic packaging (multilayer films, pouches, thermoformed trays for food and non-food) | 1 | 4 |
| Manufacturing – injection-moulded plastics (technical components and consumer housings) | 1 | 4 |
| Proptech / urban planning software | 1 | 4 |
| Sustainable construction materials and prefabricated building systems | 1 | 4 |
| Water treatment and municipal water services | 1 | 4 |
| Cleantech — biomass and organic waste valorisation | 1 | 3 |
| Fintech — B2B payment infrastructure and reconciliation | 1 | 3 |
| Fintech — alternative lending and credit scoring | 1 | 3 |
| Fintech — micro-business bookkeeping and tax-filing SaaS | 1 | 3 |
| Geospatial / GIS services | 1 | 3 |
| HR tech / HR services | 1 | 3 |
| Insurtech — usage-based motor and property insurance | 1 | 3 |
| Land surveying and underground infrastructure mapping | 1 | 3 |
| Manufacturing – industrial packaging (corrugated board boxes, protective inserts, custom die-cut packaging) | 1 | 3 |
| Municipal solid waste collection, sorting and recycling | 1 | 3 |
| Structural engineering and construction design | 1 | 3 |
| Additive manufacturing | 1 | 2 |
| Agri-tech software | 1 | 2 |
| Automotive software | 1 | 2 |
| Conversational AI | 1 | 2 |
| Energy software | 1 | 2 |
| Environmental engineering | 1 | 2 |
| Food processing (milling) | 1 | 2 |
| Industrial software | 1 | 2 |
| IoT hardware | 1 | 2 |
| Logistics software | 1 | 2 |
| Medical devices | 1 | 2 |
| Packaging | 1 | 2 |
| Water quality testing and on-site treatment equipment for food industry | 1 | 2 |
| Water software | 1 | 2 |
| Agri-tech | 1 | 1 |
| Construction consulting | 1 | 1 |
| Energy storage | 1 | 1 |
| Quantum software | 1 | 1 |
| Textiles | 1 | 1 |
| **合計** | **153** | **489** |

企業の文章は、損失額、納期、誤検知率、故障頻度、人員・データ不足といった経営上の痛みから始まり、textに症状、detailに既存の試行・制約・目標を書く傾向がある。すべての489件でtext/detailが非空だが、情報量は同一ではない。短いtextだけで意味を決めず、detailと企業のrd_capacityを読む必要がある。会社ページ917件はwebsite153、job301、news181、blog147、event135で、求人票は「今いる人の能力」とは異なる。

企業語から研究語への橋渡しは、たとえば以下のようになる。これは引用ではなく調査者の要約であり、表の右側は検索拡張の候補である。

| 課題ID | 経営側の問題の言い方 | 学術検索に使える語 |
|---|---|---|
| C001-CH1 | 攻撃例がなく異常を検知できない | one-class classification, unsupervised anomaly detection, ICS/SCADA |
| C002-CH1 | 正解クリックが理解なのか当てずっぽうなのか分からない | knowledge tracing, learning analytics, psychometrics |
| C009-CH1 | 活用形・文字体系の違いで検索に失敗する | lemmatization, morphology, transliteration |
| C025-CH1 | PCBが放射試験に落ち再試験費用がかさむ | EMC/EMI, near-field scanning, signal integrity |
| C036-CH1 | ラズベリーが9日でかびる、14日もたせたい | modified atmosphere packaging, predictive microbiology, film permeability |
| C054-CH2 | トラップの害虫を人が数える手間を減らしたい | insect counting, pest monitoring, computer vision |
| C094-CH1 | 中古電池の評価に20時間かかる | state-of-health estimation, partial charging curves, second-life batteries |

語彙の距離は、課題textの正規化後の異なり語集合Qに対し、研究者keywordsの語集合Kとの `|Q∩K|/|Q|` で測った。ストップワード、小文字化、アクセント除去、キリル文字の転写は後述の検索と同じ。英語への翻訳、語幹化、同義語追加はしていない。

- 全研究者のkeywordsを合併した語彙との被覆率は、489課題で中央値 **50.0%**。
- 各課題について最も重なる1研究者のkeywordsを選んでも、被覆率中央値は **11.54%**。**460/489件（94.07%）**が25%未満、完全に0は2件。
- C054-CH2は全研究者語彙に対しても0%、C101-CH1は87.5%。後者は検索失敗したので、語彙が重なることと専門が適合することは別である。

この値は意味的な距離や正解率ではない。長い経営説明ほど一般語・制約語が多くなること、単数複数やセルビア語の活用を揃えていないこと、短いtextでは比率が不安定になることに依存する。keywordsだけを索引にすると、経営上の症状から専門を探しづらいという診断指標として読む。

安価なローカル検索には、まず成果単位の**BM25語彙検索**を使い、ヒットした根拠から研究者IDへ戻る構成を勧める。語の出現頻度を飽和させ、文書長を調整するBM25の考え方・パラメータは公式資料で確認できる。本実験のk1は1.5、bは0.75と明示的に設定し、既製ライブラリのデフォルト値とは主張しない。[Elasticsearch公式のBM25説明](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity)

今回実行したベースラインは次の固定仕様である。これは一回の検索評価スクリプトであり、共同研究の可否を決めるマッチメーカーではない。

1. 研究者のfields/keywords/bioを1文書、各論文のtitle/keywords/abstract、各プロジェクトのtitle/summary、各特許のtitle/abstractをそれぞれ1文書とし、合計 **13,760文書**を索引化。氏名・所属・notes・open_toはスコアに混ぜない。
2. 小文字化、セルビア語キリル文字→ラテン文字、アクセント除去を行い、英数字の語を抽出する。2文字以下とスクリプト中に明記した英語・セルビア語のストップワードを除く。元のレコードは変更しない。語彙は **50,751語**。
3. 質問は各課題の `text + detail`。同じ質問語は1回だけ寄与させる。BM25は `idf=ln(1+(N-df+0.5)/(df+0.5))`、文書ごとの寄与は `idf * tf * 2.5 / (tf + 1.5*(0.25+0.75*文書長/平均長))` の総和。
4. 成果側に明記された研究者IDだけにスコアを帰属させる。研究者ごとに最も高い根拠文書のスコアを採用し、同点ならID昇順。研究者側だけの10本の不一致リンクから成果を追加しない。人物価値の順位ではなく、質問に対する文章の検索順位である。
5. 489課題全部を検索し、全件の上位3IDと根拠IDを `scratch/retrieval.json` に保存した。索引作成・全件検索・語彙被覆集計まで、この環境の一回の測定は **15.29秒**。Python標準ライブラリだけで実行し、有料API・埋め込みモデルは使っていない。速度は環境依存で、メモリ使用量は測定していない。

評価用10件は無作為標本ではなく、業種・言語差・非研究課題・該当根拠不足を含む診断用の選定である。7件の具体的研究課題と、3件の棄却・注意事例を選んだ。選定IDはスクリプト内に固定し、検索結果を見て候補IDを書き換えていない。次表の○は「表示された根拠が課題の主要な技術問題に直接関係」、△は「隣接する知見だが条件・対象・役割の不足」、×は「この課題の解決根拠にできない」。共同研究の受諾・成功を意味しない。

| 課題ID・問題 | 1位 ID（スコア） | 2位 ID（スコア） | 3位 ID（スコア） | 順位ごとの判定 | 根拠IDと精読所見 |
|---|---|---|---|---|---|
| C001-CH1：攻撃ラベルなしの産業ネットワーク異常 | R1008（63.90） | R1015（62.20） | R0979（56.27） | ○ / ○ / ○ | SYN-PUB-10477はICSの非教師あり検知、SYN-PUB-10523は正常Modbus通信からの学習、SYN-PUB-10239はICS検知器の軽量化。R0979の主プロフィール分野は別だが共著リンクは存在。BACnet実績や担当貢献は別途確認する。 |
| C002-CH1：児童の理解と推測の区別 | R0006（49.76） | R0872（45.36） | R0879（45.14） | × / △ / × | SYN-PUB-00064は教師の正書法知識、SYN-PUB-09346は学習時の親子会話、SYN-PUB-09400は進路推薦と階層。2位は学習行動に近いがクリック履歴から理解を推定する直接根拠がない。 |
| C009-CH1：セルビア語の活用と文字体系 | R0288（90.68） | R0925（65.90） | R0349（65.79） | ○ / ○ / ○ | SYN-PUB-03589は活用と検索漏れ、SYN-PUB-09810は形態変化を考慮する検索、SYN-PUB-04279は文字体系統一。2位の手法には埋め込みもあるが、専門の関連を示す根拠として判定した。 |
| C025-CH1：PCBの放射不合格 | R0637（105.93） | R0115（73.61） | R0587（63.12） | ○ / ○ / △ | SYN-PUB-07261はPCBレイアウトのEMCリスク評価、SYN-PUB-01515は近傍界計測・FDTD・設計検査。SYN-PUB-06782はLoRa機器のEMC試験で、周波数帯・製品条件が異なる。 |
| C036-CH1：ラズベリーのかび・日持ち | R0976（106.58） | R0426（64.98） | R0926（64.98） | ○ / × / × | SYN-PUB-10216はベリー包装フィルムの透過性とかび低減。ただし14日の達成保証ではない。残る2人は同じSYN-PUB-05124の共著者で、内容は電子機器筐体内の結露。湿度・温度という語が誤誘導する。 |
| C054-CH2：セルビア語で書かれた害虫計数 | R0228（50.53） | R0496（50.27） | R0502（46.08） | × / △ / × | SYN-PUB-02895はSaaS解約予測、SYN-PRJ-0239は画像によるFDM品質監視、SYN-PUB-05909はブドウ根圏の菌根。2位の画像手法は転用候補にすぎず、害虫計数の直接根拠は拾えていない。 |
| C094-CH1：中古電池を短時間で評価 | R0660（58.94） | R0826（58.44） | R0704（57.24） | × / △ / ○ | SYN-PUB-07473はSiC MOSFET過渡モデルで電池劣化ではない。SYN-PUB-08971は一次リチウム電池の保管劣化で対象が違う。SYN-PUB-07876は中古EV電池の部分充電曲線によるSoH推定で直接関連する。 |
| C101-CH1：量子回路の誤差緩和 | R0083（42.64） | R0925（37.96） | R0016（37.38） | × / × / × | SYN-PUB-01116は音声ノイズ、SYN-PUB-09813はNLPのzero-shot、SYN-PUB-00176は工場の無効電力補償。noise、shots、circuit等の共有語が誤一致。候補提示を保留するべき例。 |
| C006-CH2：資本構成・契約の整理 | R0125（53.69） | R0513（45.62） | R0766（39.54） | × / × / △ | SYN-PUB-01646は起業支援仲介、SYN-PRJ-1604はgreen sukuk、SYN-PUB-08426は株主救済。3位に関連法学の知見はあるが、現文の依頼は資金調達前の法務処理。博士研究へ自動変換しない。 |
| C137-CH3：常勤技術者の採用難 | R0109（40.14） | R0287（40.14） | R0966（40.14） | × / × / × | 3人ともSYN-PRJ-0398の参加者。製造ネットワーク統合の研究歴は、企業への転職意思や提示給与での採用可能性を示さない。 |

表示された論文のtitle/abstractと研究者keywords、プロジェクトのsummary、課題detailを精読して判定した。成果IDの原典は固定版の[論文](https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/4fb99b3749adf0d10b5977089ff4c73f4f522240/data/publications.jsonl)、[プロジェクト](https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/4fb99b3749adf0d10b5977089ff4c73f4f522240/data/projects.json)、[企業課題](https://github.com/jigjoy-ai/einstein-matchmaker-data/blob/4fb99b3749adf0d10b5977089ff4c73f4f522240/data/companies.json)で確認できる。

7件の研究課題だけでみると、○が1位にあるのは **4/7件**、上位3位内にあるのは **5/7件**だった。10件全部ではそれぞれ4/10、5/10だが、棄却を期待する3件を混ぜた値を検索精度の代表値にはしない。全候補を網羅して正解付けしていないので、Recall@3、全489件の精度、主催者基準の合格率は測れていない。棄却すべき事例にも必ず上位候補が出る点が、単純検索の限界である。

次に安く試すなら、全文投入よりも「対象・症状・制約」を短い検索語に変換し、上の対応表を出発点に人が確認した小さな英語／セルビア語の語彙辞書を足す。セルビア語の活用形には文字n-gramや形態正規化を併用する余地がある。原文経路と拡張語経路を別々に検索すれば、追加語による誤誘導を確認しやすい。ただし、ここではこれらの改善を実装・評価していないため、精度向上の数値は主張しない。notes/open_to/rd_capacity/ページの日付は、その後の実現可能性チェックに使う。全文の共起だけで否定条件や利用可能設備を判定しない。

自動マッチメーカーを作る場合にCriticが確認すべき点は、今回の観測から次のように整理できる。トラックも出典確認と根拠のない技能・論文の排除をCriticの役割として示している。[トラックの役割説明](https://jigjoy.ai/tracks/einstein)

| 落とし穴 | 今回の具体例・影響 | Criticが確認すること |
|---|---|---|
| 人名を結合キーにする | 同名2組、別表記4組、IDなし同名著者812エントリ | IDの出典、論文側著者ID、所属・専門・年代。曖昧な統合は保留し、別レコードを残す。 |
| 片方向リンクを事実扱い | 論文参照10本が非対称 | どちらのファイルが何を主張するかを記録し、修正・統合前に根拠を提示する。 |
| 共著・共同参加を全技能に拡張 | R0979の主分野とヒット論文の差、C137-CH3で3人が同点 | 共著者・参加者の役割は何か。プロジェクト要約のPIの仕事を全員に帰属させていないか。 |
| 同じ単語の別の意味 | quantum noise→音声ノイズ、zero-noiseのshots→zero-shot、電池charge→MOSFETゲート電荷 | 対象物・入力・出力・機構が一致するか。単語だけの一致を説明文で増幅しない。 |
| 環境条件を無視 | ベリー包装→電子筐体結露、一次電池→中古充電池 | 材料、対象集団、周波数帯、温湿度、性能目標が実験範囲と合っているか。 |
| 否定・必須条件を落とす | C001-CH1は攻撃ラベルなし。R0305のnotesは部分教師ありを好み完全非教師ありを希望しない | 「ない」「不可」「不要」「限定」の条件を抽出し、必要データが存在するかを見る。 |
| 古い業績を現在の稼働能力とする | 退職20件、離籍1件、最新ページも2024年 | 現在の所属、指導可否、役割、稼働、設備へのアクセス。退職者の相談可能性も別に扱う。 |
| 求人・計画を既存能力とする | job301ページ、過去の将来計画 | 採用したい技能と保有技能、購入予定と使用可能設備、過去協力と現在契約を分ける。 |
| 欠落をモデルが補完 | bio60、論文abstract640、keywordsだけ1 | 何が書かれていないかを明示。欠落を能力不足にも、架空の経験にも変換しない。 |
| 非研究の依頼を博士課題に変換 | 資金・採用・契約実務の104候補 | 要求成果が何か。研究協力、通常の技術支援、法律相談、融資、採用を取り違えない。 |
| 検索不発を大学の能力不在とする | C054-CH2の言語不一致、C094-CH1の3位に直接根拠 | 別表記・別言語・短い技術語で再検索してから、見つからない理由と探索範囲を記録する。 |
| スコアを適合確率にする | 無関係でも40点台、同じ根拠で同点の複数人 | BM25はクエリごとの語彙スコアで確率ではない。課題間の大小比較で棄却閾値を決めない。 |
| 合成文の主張を外部の事実にする | 法規・費用・実験成績も架空記述の一部 | 本資料の実験は「データ内で関連する」評価。現実の規制や論文実在性の証拠として引用しない。 |

名前だけでなく機関ラベルも正規化が必要で、facultyは文字列として37種類ある。READMEの16学部・研究所という説明とは集計単位が違い、翻訳・文字体系の別名を整理せず「37機関」と数えるのは誤りである。また企業のsectorも64ラベルなので、類似業種をまとめる場合は対応表と元ラベルを残す。

再現用ファイルはすべてこの成果物フォルダにある。分析スクリプトは入力データを書き換えない。機械集計と手動注釈を別に保存し、計算結果を根拠なく真の正解ラベルに見せない構成にした。

| ファイル | 用途 |
|---|---|
| `調査報告.md` | この日本語報告。主な表・10件の根拠評価を集約 |
| `scratch/einstein-matchmaker-data/` | 固定commitのclone、元のREADME・docs・データ |
| `scratch/audit.py` / `audit.json` | ファイル件数、全フィールド空欄、SHA-256、ID、結合、名前、言語、CSV検査 |
| `scratch/retrieval.py` / `retrieval.json` | 標準ライブラリだけの検索測定、全489件の上位3件と根拠 |
| `scratch/annotations.py` / `annotations.json` | 非研究候補104件、根拠なし精読例3件、別表記候補4組、10件の関連度判定の手動注釈 |
| `scratch/verify.py` | 報告の131 ID、件数、検索根拠1,467本、CSV一致、元データ無変更の検査 |
| `scratch/track.html` / `track.txt` | 取得した公開トラックページと本文 |

再実行例（Python 3のみ必要、ネットワーク接続不要）：

```bash
cd (pre-event scratch folder)
python3 audit.py
python3 annotations.py
python3 retrieval.py
python3 verify.py
```

元データは変更せず、公開ページと公開リポジトリだけを参照した。アカウントの作成、主催者への連絡、提出・公開は行っていない。
