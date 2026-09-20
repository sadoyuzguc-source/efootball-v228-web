# eFootball Lig Yönetim Sistemi — v228 Web

`M:\eFootball_Lig_Yonetim_Sistemi_v228.xlsm` dosyasının VBA işleyişi temel alınarak oluşturulmuş **bağımsız web projesi**.

## Hemen aç

**[http://localhost:3228](http://localhost:3228)**

Uygulama kapalıysa bu klasördeki **`BASLAT.cmd`** dosyasına çift tıklayın. Sunucuyu başlatır ve tarayıcıyı açar. Zaten açıksa ikinci bir sunucu oluşturmaz.

**Giriş:** Excel dosyanızdaki kullanıcı adı ve mevcut şifreniz. Excel'in `SifreKodla` dönüşümü çözülerek web için bcrypt ile saklanmıştır. Dört kaynak hesabın şifre dönüşümü doğrulanmıştır. Yeni hesaplar ilk girişte kişisel şifrelerini belirler.

## Ekranlar

- **Ana menü:** Lig/kupa filtresi, gerçek haberler, haber gezintisi, yayın takvimi ve canlı sayaçlar.
- **Ligler:** Oyuncu/takım puan durumu, tek/çift devre fikstür, gol/asist/kart istatistikleri ve sezon arşivi.
- **Kupalar:** Doğrudan eleme, dört ligden gruplu kupa, kura, BAY geçişi, eleme ağacı, otomatik sonraki tur ve şampiyonun müzeye yazılması.
- **Takımlar:** Menajer, bütçe, logo, takım müzesi, kadro ve kadrodan çıkarma.
- **PESDB kataloğu:** Yerel arama, pozisyon/uyruk filtresi, çoklu seçim, hedef takıma aktarım; PESDATA çevrimiçi araması ve sonuçlardan yerel kataloğa kart ekleme.
- **Haberler:** Oluşturma, düzenleme, silme, aktif/pasif durum, lig filtresi, fotoğraf yükleme.
- **Canlı yayın:** Lig oyuncularından eşleşme, tarih/saat/link, düzenleme, aktif/pasif durum ve yayını açma.
- **Ayarlar:** Lig/oyuncu/kullanıcı/rol yönetimi, oyuncuları topluca lige taşıma, fikstür, skor ve olay girişi, sistem hareketleri, Excel dışa aktarımı ve web yedeği.

## Temel kurallar

- Fikstür aktif **oyuncu adları** üzerinden oluşturulur. Bir eşleşme çift devrede ev/deplasman olarak iki kez oynanır.
- Puan tablosunda yalnızca **Oynandı** durumundaki maçlar sayılır; 0–0 beraberlik geçerlidir.
- Oynanmış maç bulunan fikstür yeniden oluşturulamaz.
- Futbolcu maçın iki takımından birinin kadrosunda olmalıdır; asist yapan aynı takımda farklı bir futbolcu olmalıdır.
- Olaylarıyla kaydedilen maç ikinci kez kaydedilemez. Skor ve olaylar tek veritabanı işlemiyle kaydedilir.
- Eleme maçlarında beraberlik kabul edilmez; BAY maçları otomatik sonuçlanır.
- Sezonun bütün maçları bitmeden yeni sezona geçilemez. Geçişte sıralama ve istatistikler arşivlenir; takım, oyuncu, kadro ve müze kayıtları korunur.
- Yetkiler hem ekranda hem sunucuda kontrol edilir. Birden fazla tarayıcıdan eşzamanlı değişiklikte eski veriyle kaydetme engellenir.

## Veriler nerede?

| Konum | İçerik |
|---|---|
| `data/efootball.sqlite` | Bu uygulamanın bağımsız, kalıcı SQLite veritabanı |
| `data/source-sheets.json` | Kaynak Excel'in tüm hücrelerinin özel arşivi |
| `data/import-report.json` | Aktarılan kayıt sayıları ve bulunamayan harici görseller |
| `public/themes/` | Excel'e gömülü özgün tema görselleri |
| `public/uploads/` | Aktarılan/yüklenen haber fotoğrafları ve takım logoları |
| `analysis/vba/` | Kaynak dosyadan çıkarılan 51 VBA bileşeni |
| `analysis/workbook.json` | Sayfa ve yordam envanteri |

Excel kaynak dosyası web işlemleri sırasında değiştirilmez. Diğer `efootball-web` projesinin veritabanı, sunucusu veya kodu bu uygulama tarafından kullanılmaz.

### Aktarılan kayıtlar

5 lig + 1 kupa, 5 oyuncu, 5 takım, 9 maç, 6 maç olayı, 23 kadro kaydı, 23 yerel katalog kartı, 22 sezon arşiv satırı, 4 haber, 1 yayın, 4 kullanıcı, 9 rol, 13 yetki kaydı, 86 geçmiş hareket.

**Katalog ayrıntısı:** `DATA_PESDB` sayfasında 4.982 yardımcı ülke eşleştirme satırı vardır. Katalog kimliği bulunan gerçek yerel kart sayısı 23'tür. Yardımcı hücreler de `source-sheets.json` içinde korunur.

İki eski haber görselinin harici dosyası bulunamadı; bu haberler için Haberler → Düzenle → Görsel Seç kullanılabilir. Dosya yolları aktarım raporunda yer alır.

## Yedekleme

Admin hesabıyla **Ayarlar → Web Yedeği İndir** bütün uygulama verilerini indirir. **Yedekten Geri Yükle**, yüklemeden önce mevcut verileri `data/restore-before-*.json` dosyasına kaydeder ve oturumları kapatır.

Yüklediğiniz dosyaları da korumak için **`public/uploads` ve `public/themes` klasörlerini ayrıca yedekleyin**. Web yedeği kullanıcı hesaplarının parola özetlerini de içerir; özel dosyadır.

**Excel'e Aktar** güncel lig, takım, kadro, maç, kupa, istatistik, arşiv, haber ve yayın tablolarını `.xlsx` olarak indirir. Bu çıktı VBA makroları içermez. Tam uygulama geri yüklemesi için JSON web yedeği kullanılır.

## Geliştirme / yeniden kurulum

Node.js **24 veya üzeri** gerekir; ayrıca Excel kurulumu gerekmez.

PowerShell'de `npm.ps1` engelliyse aşağıdaki `npm.cmd` komutlarını kullanın:

```powershell
# Çalışma klasörü: M:\opencode proje1\efootball-v228-web
npm.cmd install
npm.cmd run inspect
npm.cmd run import
npm.cmd run build
npm.cmd run open
```

`import` yalnızca boş veritabanına aktarır; dolu veritabanını silmez. Farklı kaynak dosyası:

```powershell
node scripts/import-workbook.mjs "M:\baska-dosya.xlsm"
```

```powershell
npm.cmd run dev         # Geliştirme; varsayılan port 3228
npm.cmd start           # Derlenmiş sürüm; terminal açık kalır
npm.cmd run build       # Kod değişikliklerini üretim sürümüne derle
npm.cmd test            # VBA iş kuralları testleri
npm.cmd run audit:import # Kaynak kimlikleri, adetler ve şifre dönüşümlerini doğrula
npm.cmd run test:e2e    # Ayrı test veritabanı, port 3229; ana verileri değiştirmez
```

Tarayıcı testlerinden önce gerekirse `npx.cmd playwright install chromium` çalıştırılır. Başka port için `PORT`, veri klasörü için `DATA_DIR`, ağ dinleme adresi için `HOST` kullanılabilir. Varsayılan olarak yalnızca bu bilgisayardan erişilir. İnternete dağıtım bu yerel kurulumun dışında ayrıca yapılmalıdır.

## Teknik yapı

React 19 + Vite arayüz, Express 5 API, Node.js SQLite, ExcelJS aktarım, bcrypt hesap doğrulama. `shared/rules.mjs` saf lig/kupa kurallarıdır; `server/domain.mjs` işlemleri ve `server/store.mjs` atomik kayıtları yönetir.

**VBA incelemesi ve eşleşme notları:** [VBA-ESLESME.md](VBA-ESLESME.md).
