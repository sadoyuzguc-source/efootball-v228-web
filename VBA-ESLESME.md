# v228 VBA incelemesi ve web eşleşmesi

## İnceleme yöntemi

XLSM ZIP kapsayıcısındaki `xl/vbaProject.bin` açıldı. OLE akışlarındaki sıkıştırılmış VBA kaynakları çözüldü; 51 bileşen `analysis/vba` klasörüne çıkarıldı. 23 çalışma sayfasının hücreleri, 23 kullanıcı formunun kaynak kodları, ana iş modülü ve pencere/görsel yardımcı modülleri envantere alındı.

`DATA_TEMA` içindeki birden çok sütuna bölünmüş base64 görseller birleştirilerek 18 özgün tema JPEG'i çıkarıldı. Harici haber ve takım görselleri mevcutsa bağımsız projenin `public/uploads` klasörüne kopyalandı.

## İşlev eşleşmesi

| VBA formu / yordamı | Web karşılığı |
|---|---|
| `frmGiris`, `SifreKodla`, `frmIlkSifre` | Giriş, mevcut Excel şifresinin bcrypt'e dönüşümü, ilk şifre/şifre değiştirme |
| `frmAnaMenu`, `V225AnaMenuFiltresiniUygula` | Haber/yayın panelleri, lig/kupa filtresi, sayaçlar |
| `frmLigGoruntule`, `frmPuanDurumu`, `PuanDurumunuYukle` | Lig ekranı; oyuncu adı üzerinden O/G/B/M/AG/YG/AV/P hesabı |
| `frmLigOlustur`, `frmLigler` | Ayarlar → Lig Yönetimi, oluşturma/düzenleme/silme |
| `frmOyuncular` | Oyuncu ve takım oluşturma, lig atama, aktif/pasif, düzenleme |
| `frmFikstur`, `FiksturOlustur` | Tek/çift devre, haftalık tarih, BAY, oynanmış fikstürü koruma |
| `frmMacGiris`, `MacFutbolculariniYukle` | İki tarafın gerçek kadrosundan olay seçme, aynı takım asist kontrolü |
| `MaciKaydet`, `MacOlaylariniKaydetLigID` | Atomik skor/olay kaydı, tekrar yazmayı engelleme |
| `frmIstatistikler` | Maç olaylarından gol, asist, sarı/kırmızı kart tabloları |
| `frmKupaOlustur`, `KupaOlusturVeKura` | Kaynak ligden doğrudan eleme veya 4 ligden 4 gruplu ulusal kupa |
| `KupaElemeTuruOlusturYeni` | İkinin kuvveti slotlar, BAY; 12–16 takımda doğrudan çeyrek final kuralı |
| `KupaCeyrekFinalOlustur` | A1–B2, B1–A2, C1–D2, D1–C2 |
| `KupaElemeOtomatikIlerle` | Sonucun kaydıyla otomatik tur ilerleme ve şampiyon belirleme |
| `KupaSampiyonunuMuzeyeYansit` | Şampiyon takımın müzesine bir defalık kupa kaydı |
| `frmTakimlar` | Takım profili, logo/bütçe/müze düzenleme, kadro listesi |
| `frmKatalog`, `PesdataSitedeAra` | Çevrimiçi imzalı PESDATA araması, yerel katalog, çoklu aktarım |
| `KadroyaEkle` | Aynı takımda aynı kartın tekrarını engelleme |
| `frmHaberler`, `frmCanliYayin` | Haber ve yayın CRUD, aktiflik/lig filtresi, görsel yükleme |
| `frmAyarlar` | Üç grup halinde yönetim merkezi |
| `frmKullaniciOlustur`, `frmRolYonetimi`, `RolYetkisiVar` | Kullanıcı/rol yönetimi, VBA yetki kodları, sunucu kontrolü |
| `frmHareketler` | Aktarılan geçmiş ve web işlem günlüğü; arama/filtre/sayfalama |
| `frmSezonArsiv`, `LigYeniSezonaHazirla` | Sezon sonu kontrolleri, sıralama/istatistik arşivi, yeni sezon |
| Excel kaydet/çıkış ve `frmYukleniyor` | Otomatik veritabanı kaydı, işlem bekleme göstergeleri, güvenli oturum kapatma |

## Kaynakta tespit edilen ayrıntılar

- **Katalog sayacı yanıltıcı olabilir:** 4.982 satırın tamamı yerel futbolcu değildir; yardımcı `PLAYER_ID / UYRUK` sütunları sayfayı uzatır. Gerçek yerel kimlik sayısı 23'tür. Web kart sayacı kimlikli kayıtları sayar.
- **Karakter kodlaması:** Bazı kaynak hücreleri/yordamlarında `PlanlandÄ±` gibi bozuk Türkçe vardır. İşlem durumları webde `Planlandı / Oynandı` biçiminde gösterilir.
- **Tarih:** ExcelJS tarihleri JavaScript Date olarak döndürür. Sayısal seri tarih ve Date değerleri ayrıştırılarak maç tarihi/yayın saati korunmuştur.
- **Lig eşleşmesi:** Maçların tarafları takım adı değil oyuncu/menajer adıdır. Web puan tablosu bu anahtarı kullanır.
- **Kupa:** Kaynakta 1 kupa ayar kaydı vardır; ikinci örnek kupa üretilmez. Kupa da `DATA_Ligler` içinde bir organizasyondur; kimlikler değiştirilmez.
- **Görseller:** İki haber fotoğrafı eski, mevcut olmayan harici dosya yoluna bağlıdır. Web gerçek bir eksik-görsel durumu gösterir ve yeniden yüklemeye izin verir.
- **PESDATA:** Kaynağın imza yöntemiyle canlı arama doğrulandı. Servis listesi bazı kartlarda ayrıntılı hız/şut/pas/ülke alanlarını göndermeyebilir; dış servisin yanıtı ve erişilebilirliği bu projeden bağımsızdır.

## Web uyarlamasının sınırları

- Arayüz özgün görseller, renkler, Türkçe menüler ve form işleyişi üzerinden yeniden oluşturuldu. **Excel UserForm ekranıyla piksel piksel eşitlik ölçülmedi.** Mobil uyum, tarayıcı tabloları ve modal pencereler web uyarlamasıdır.
- Windows API ile Excel penceresini tam ekran tutma, GDI/PNG saydamlık yordamları ve Excel kapanış istemleri tarayıcıda karşılıklarına uyarlanmıştır; VBA çalıştırılmaz.
- Oyuncu lig değişikliği tekli düzenleme veya çoklu seçimle yapılır. Toplu taşımada pasif ligden çıkışa izin verilir; devam eden aktif kaynak fikstürü olan oyuncular atlanır ve sonuç sayıları gösterilir.
- `.xlsx` dışa aktarım veri tablosudur; özgün `.xlsm` dosyasına makro veya hücre biçimiyle geri yazım değildir. Tüm kaynak hücreler özel arşiv dosyasında korunur.
- Kaynak `DATA_SezonIstatistikArsiv` boştur. Bu nedenle eski sezonların bulunmayan istatistikleri üretilmez; webde kapatılan yeni sezonların istatistikleri kaydedilir.

## Doğrulama

- Kaynak kimlik ve kayıt adetleri: 19 veri tablosunda karşılaştırma; 0 eşleşme hatası.
- Mevcut dört kullanıcı şifresinin dönüşümü doğrulandı; şifreler rapora yazılmadı.
- Fikstür, puan, BAY, doğrudan eleme, gruplu kupa, yeni sezon, yetki ve skor doğrulama testleri.
- Ayrı test veritabanıyla tarayıcıda giriş, tüm ekranlar, masaüstü/mobil, lig/oyuncu oluşturma, fikstür, skor, kayıt kalıcılığı ve yetkisiz API erişimi kontrol edildi.

Son doğrulamada **13 iş kuralı/veritabanı testi ve 5 uçtan uca tarayıcı testi geçti**. Üretim derlemesi başarıyla tamamlandı. Test komutları ve çalışma bilgileri `README.md` içindedir.
