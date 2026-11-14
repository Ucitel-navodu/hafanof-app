<!-- Text funkčního zadání (týmový checklist) převzatý z dokumentu
     „HAFANOF_Funkcni_zadani_aplikace_1_0_tymovy_checklist.docx“. Stav implementace je v zadani-1.0-stav.md. -->

**HAFANOF**

**FUNKČNÍ ZADÁNÍ APLIKACE 1.0**

Týmový checklist pro připomínkování a vývoj

Cíl: jedna aplikace pro každodenní řízení Hafanofu -- od přijetí psa
přes zdravotní péči, dočasku a adopci až po finance, dokumenty, úkoly a
tým.

# Jak dokument používat

Dokument pošlete do WhatsApp skupiny. Každý člen týmu může v mobilním
Wordu nebo Google Dokumentech označit konkrétní bod a přidat komentář.
Vlastimil tak uvidí připomínky přímo u požadavku a po odsouhlasení může
jednotlivé body odškrtávat.

🔴 MUST HAVE -- nutné pro první použitelnou verzi.

🟡 SHOULD HAVE -- systém s funkcí počítá, dokončení může přijít později.

🟢 NICE TO HAVE -- budoucí rozvoj.

# 1. Základní principy

- [ ] 🔴 Jedna centrální databáze; stejné údaje se nemají opisovat mezi
několika evidencemi.

- [ ] 🔴 Aplikace musí být plnohodnotně použitelná na PC i mobilu.

- [ ] 🔴 Každý uživatel má vlastní účet a oprávnění podle role.

- [ ] 🔴 U důležitých změn ukládat kdo, kdy a co změnil.

- [ ] 🔴 Dokumenty, fotografie, úkoly, náklady a komunikaci lze navázat na
konkrétního psa nebo osobu.

- [ ] 🔴 Globální vyhledávání napříč psy, lidmi, dokumenty a záznamy.

- [ ] 🔴 Pravidelné zálohování a možnost obnovy.

- [ ] 🟡 PWA -- možnost přidat webovou aplikaci na plochu telefonu.

# 2. Přihlášení a uživatelské role

- [ ] 🔴 Přihlášení a odhlášení uživatele.

- [ ] 🔴 Administrátor.

- [ ] 🔴 Statutární ředitel.

- [ ] 🔴 Revizor / kontrolní role.

- [ ] 🔴 Člen interního týmu.

- [ ] 🟡 Dočasná péče -- omezený přístup pouze k přiděleným psům.

- [ ] 🟡 Dobrovolník -- úkoly, směny a nezbytné informace.

- [ ] 🟢 Veterinář/fyzioterapeut -- případný omezený zdravotní přístup.

- [ ] 🟢 Adoptující -- budoucí klientský portál.

- [ ] 🔴 Oprávnění kontrolovat i na serveru, ne pouze skrýváním tlačítek v
rozhraní.

# 3. Hlavní nástěnka

- [ ] 🔴 Počet psů aktuálně v péči, v dočasce, k adopci a rezervovaných.

- [ ] 🔴 Dnešní úkoly a úkoly po termínu.

- [ ] 🔴 Nadcházející veterinární termíny, léky, očkování a kontroly.

- [ ] 🔴 Nové nebo nevyřízené žádosti o adopci.

- [ ] 🟡 Dokumenty vyžadující doplnění nebo podpis.

- [ ] 🟡 Výročí adopcí a další důležitá data.

- [ ] 🟡 Rychlá tlačítka: přidat psa, osobu, úkol, výdaj, dokument.

# 4. Karta psa -- základní údaje

- [ ] 🔴 Automaticky generované unikátní evidenční číslo.

- [ ] 🔴 Jméno, původní jméno/alias.

- [ ] 🔴 Profilová fotografie a galerie.

- [ ] 🔴 Pohlaví, plemeno/kříženec, barva/popisek.

- [ ] 🔴 Datum narození nebo odhad + označení, že jde o odhad.

- [ ] 🔴 Číslo čipu a případně pas/další identifikace.

- [ ] 🔴 Datum přijetí, způsob a původ přijetí.

- [ ] 🔴 Aktuální umístění a odpovědná osoba.

- [ ] 🔴 Stav psa: nově přijatý / v péči / v DP / k adopci / rezervovaný /
adoptovaný / zemřelý / jiné ukončení.

- [ ] 🔴 Datum ukončení evidence a automatický počet dnů v péči.

- [ ] 🟡 Povaha; vztah k lidem, dětem, psům a kočkám; manipulace; samota;
hygiena; cestování; specifické potřeby; ideální domov.

# 5. Časová osa psa

- [ ] 🔴 Automaticky skládat chronologii významných událostí.

- [ ] 🔴 Zahrnout přijetí, veterinární návštěvy, přesuny, DP, změny
adopčního stavu, adopci a ukončení evidence.

- [ ] 🟡 Možnost přidat vlastní událost nebo poznámku.

- [ ] 🟡 Kliknutím z události otevřít související dokument/záznam.

# 6. Zdravotní evidence

- [ ] 🔴 Vstupní zdravotní stav.

- [ ] 🔴 Veterinární návštěvy: datum, pracoviště, veterinář, důvod a
závěr.

- [ ] 🔴 Diagnózy, operace a další zákroky.

- [ ] 🔴 Léky: název, dávka, frekvence, od--do, poznámka.

- [ ] 🔴 Očkování a platnost; odčervení a antiparazitika.

- [ ] 🔴 Kastrace -- stav a datum.

- [ ] 🔴 Laboratorní výsledky a přílohy veterinárních zpráv.

- [ ] 🔴 Hmotnost + historie váhy.

- [ ] 🟡 Fyzioterapie/rehabilitace.

- [ ] 🔴 Automatická upozornění na kontrolu, očkování nebo další dávku.

# 7. Dokumentace psa

- [ ] 🔴 Evidenční karta psa.

- [ ] 🔴 Zdravotní přehled.

- [ ] 🔴 Dokumentace k přijetí.

- [ ] 🔴 Veterinární dokumentace.

- [ ] 🔴 Adopční dokumentace.

- [ ] 🔴 Dokumentace úmrtí / ukončení evidence.

- [ ] 🔴 Ostatní dokumenty a fotodokumentace.

- [ ] 🔴 Nahrávání PDF, DOCX a obrázků.

- [ ] 🟡 Náhled dokumentů přímo v aplikaci.

- [ ] 🟡 Generování standardních dokumentů z údajů databáze bez
opakovaného opisování.

- [ ] 🟡 Stav dokumentu: připraven / čeká na podpis / podepsán / chybí.

# 8. Evidence osob

- [ ] 🔴 Jedna karta osoby může mít více rolí: adoptující, dočaskář,
dobrovolník, člen, dárce apod.

- [ ] 🔴 Jméno, telefon, e-mail, adresa a role.

- [ ] 🔴 Vazby osoby na konkrétní psy.

- [ ] 🔴 Historie důležité komunikace a událostí.

- [ ] 🟡 Souhlasy/GDPR a interní poznámky.

- [ ] 🔴 Vyhledávání podle jména, telefonu a e-mailu.

# 9. Adopční proces

- [ ] 🔴 Workflow: nový zájemce → dotazník → kontaktován → návštěva →
schválen/zamítnut → rezervace → adopce → kontroly.

- [ ] 🔴 U psa evidovat více zájemců současně.

- [ ] 🔴 Datum žádosti, dotazník, stav, poznámky z komunikace a termín
návštěvy.

- [ ] 🔴 Interní důvod zamítnutí.

- [ ] 🔴 Rezervace psa a vazba na schváleného zájemce.

- [ ] 🔴 Adopční smlouva, datum adopce a nový majitel.

- [ ] 🟡 Automatické kontroly po adopci -- intervaly nastavitelné.

- [ ] 🟡 Evidence pozdravů z domova a výročí adopcí.

- [ ] 🔴 Evidence úmrtí adoptovaného psa.

# 10. Dočasná péče

- [ ] 🔴 Seznam dočaskářů, dostupnost, kapacita a omezení.

- [ ] 🔴 Aktuálně svěřený pes a historie svěřenců.

- [ ] 🔴 Datum předání, vrácení nebo přesunu.

- [ ] 🔴 Předávací dokumentace.

- [ ] 🔴 Vybavení, krmivo a materiál vydaný s pejskem.

- [ ] 🔴 Výdaje dočasky a účtenky.

- [ ] 🟡 Dočaskář po přihlášení vidí pouze své svěřence a povolené údaje.

- [ ] 🟡 Dočaskář může přidat foto, váhu, poznámku, požadavek a nahlásit
problém.

# 11. Dobrovolníci

- [ ] 🟡 Evidence dobrovolníků, kontaktů, dostupnosti a činností.

- [ ] 🟡 Směny/akce a přidělené úkoly.

- [ ] 🟡 Potvrzení splnění úkolu.

- [ ] 🟡 Přístup pouze k údajům nutným pro jejich práci.

# 12. Úkoly a kalendář

- [ ] 🔴 Úkol: název, popis, odpovědná osoba, termín, priorita, stav.

- [ ] 🔴 Vazba úkolu na psa, osobu, adopci, sbírku nebo jiný objekt.

- [ ] 🔴 Komentáře, přílohy a opakované úkoly.

- [ ] 🔴 Přehled Moje úkoly a zvýraznění úkolů po termínu.

- [ ] 🔴 Kalendář veterin, adopčních návštěv, kontrol, akcí a úkolů.

- [ ] 🟡 Focení, svozy, směny a grantové termíny.

- [ ] 🟡 Synchronizace s Google Kalendářem.

# 13. Finance, sbírky a fundraising

- [ ] 🔴 Příjem/výdaj: datum, částka, kategorie, popis, způsob platby,
účet/pokladna, dodavatel/příjemce.

- [ ] 🔴 Příloha dokladu.

- [ ] 🔴 Vazba výdaje na psa a případně sbírku/projekt.

- [ ] 🔴 Automatický součet nákladů na psa.

- [ ] 🟡 Stav dokladu: nezpracováno / zkontrolováno / zaúčtováno.

- [ ] 🟡 Export pro účetnictví.

- [ ] 🟡 Evidence sbírek: cíl, období, vybraná částka, příjmy, výdaje a
doklady.

- [ ] 🟡 Dárci, pravidelné dary, materiální pomoc, partneři a sponzoři.

# 14. Sklad a vybavení

- [ ] 🟡 Položka, kategorie, množství, jednotka a minimální zásoba.

- [ ] 🟡 Upozornění na nízkou zásobu.

- [ ] 🟡 Expirace léků a relevantního materiálu.

- [ ] 🟡 Příjem/výdej a vazba na psa/dočasku.

- [ ] 🟡 Evidence vratného vybavení -- postroje, přepravky, vodítka apod.

# 15. Sociální sítě a komunikace

- [ ] 🟡 Kalendář příspěvků a stav: nápad / připravuje se / ke schválení /
naplánováno / zveřejněno.

- [ ] 🟡 Vazba příspěvku na psa/akci a uložení podkladů.

- [ ] 🟡 Adopční příspěvky, pozdravy z domova, výročí, soutěže a kampaně.

# 16. Spolek a administrativa

- [ ] 🔴 Evidence členů spolku, druh členství a datum vzniku/zániku.

- [ ] 🔴 Dokumentace k členství.

- [ ] 🔴 Valné hromady: pozvánka, program, prezenční listina, zápis a
usnesení.

- [ ] 🔴 Stanovy a jejich verze.

- [ ] 🔴 Účetní závěrky/výsledky hospodaření a výroční dokumentace.

- [ ] 🔴 Smlouvy a plné moci.

- [ ] 🟡 Hlídání povinných administrativních termínů.

# 17. Statistiky a reporty

- [ ] 🔴 Počet přijatých psů a adopcí za období.

- [ ] 🔴 Počet psů aktuálně v péči a DP.

- [ ] 🔴 Průměrná délka pobytu.

- [ ] 🔴 Náklady na jednotlivé psy a celkem.

- [ ] 🟡 Veterinární náklady, přehled dočasek a ukončení evidence.

- [ ] 🟡 Export do Excel/PDF a podklady pro výroční zprávu.

# 18. Upozornění a automatizace

- [ ] 🔴 Úkol po termínu, veterinární kontrola, očkování a nastavené
podávání léků.

- [ ] 🟡 Žádost o adopci bez reakce a kontrola po adopci.

- [ ] 🟡 Chybějící povinný dokument nebo údaj.

- [ ] 🟡 Nízká skladová zásoba/expirace, výročí adopce a administrativní
termín.

# 19. Audit a historie

- [ ] 🔴 U významných záznamů ukládat autora a čas změny.

- [ ] 🔴 U změny hodnoty uchovat původní i novou hodnotu.

- [ ] 🔴 Běžný uživatel nesmí auditní historii mazat.

- [ ] 🔴 Evidovat vytvoření/smazání důležitých záznamů a dokumentů.

- [ ] 🟡 Filtrovat historii podle uživatele, psa a období.

# 20. AI -- pozdější rozvoj

- [ ] 🟢 Shrnutí veterinární zprávy do karty psa -- vždy ke kontrole
člověkem.

- [ ] 🟢 Návrh adopčního textu pouze z ověřených údajů psa.

- [ ] 🟢 Návrhy e-mailů a zpráv.

- [ ] 🟢 Kontrola neúplných karet a dokumentace.

- [ ] 🟢 Vyhledávání přirozenou řečí v datech Hafanofu.

- [ ] 🟢 Podklady pro sociální sítě, statistiky a výroční zprávy.

- [ ] 🔴 AI nesmí sama měnit kritická data bez potvrzení uživatele.

# 21. Bezpečnost a technické požadavky

- [ ] 🔴 Responzivní web pro mobil/tablet/PC.

- [ ] 🔴 Bezpečné přihlášení a serverová autorizace.

- [ ] 🔴 Zálohování databáze a souborů; obnova musí být otestovatelná.

- [ ] 🔴 HTTPS.

- [ ] 🔴 Minimalizace přístupu k osobním údajům podle role.

- [ ] 🟡 Export celé evidence pro případ změny systému.

- [ ] 🟡 Dvoufaktorové ověření administrátorů.

# 22. Vzhled HAFANOF

- [ ] 🔴 Používat skutečné logo Hafanof a respektovat ochrannou zónu.

- [ ] 🔴 Brand barvy: zlatá #D1AD3B, taupe #5F574D, nude #FBF3E7 a bílá.

- [ ] 🔴 Nadpisy v duchu EB Garamond; běžný text čitelný sans-serif.

- [ ] 🔴 Mobilní rozhraní jednoduché, nejčastější úkony na minimum
klepnutí.

- [ ] 🟡 Domovská stránka „Můj Hafanof" přizpůsobená konkrétní roli.

# 23. Akceptační scénář -- pes od příjmu po adopci

Verze 1.0 není hotová, dokud celý tento scénář nelze provést bez
obcházení systému:

- [ ] 🔴 Založit nového psa a získat automatické evidenční číslo.

- [ ] 🔴 Doplnit čip, základní údaje a dokumentaci k přijetí.

- [ ] 🔴 Zapsat veterinární návštěvu, nahrát zprávu a naplánovat kontrolu.

- [ ] 🔴 Přesunout psa do dočasné péče a evidovat předané vybavení.

- [ ] 🔴 Označit psa k adopci a přidat více zájemců.

- [ ] 🔴 Evidovat komunikaci, návštěvu, schválení a rezervaci.

- [ ] 🔴 Vytvořit/doplnit adopční dokumentaci.

- [ ] 🔴 Změnit psa na adoptovaného a uložit datum adopce.

- [ ] 🔴 Automaticky ukončit počet dní v péči a naplánovat kontroly po
adopci.

- [ ] 🔴 Správně zahrnout psa do statistik.

- [ ] 🔴 V historii dohledat všechny důležité změny.

# 24. Akceptační scénář -- oprávnění

- [ ] 🔴 Administrátor vidí vše podle své role.

- [ ] 🔴 Člen týmu vidí pouze povolené moduly.

- [ ] 🔴 Dočaskář vidí pouze svého svěřence a povolené údaje.

- [ ] 🔴 Dobrovolník nevidí citlivé údaje adoptujících, finance ani
zdravotní dokumentaci, pokud je nepotřebuje.

- [ ] 🔴 Kontrolní role má potřebný přístup k hospodaření a historii.

- [ ] 🔴 Odebrání oprávnění se projeví okamžitě.

# 25. Otevřené body pro komentáře týmu

- [ ] 🟡 Jak přesně bude vypadat formát evidenčního čísla psa?

- [ ] 🟡 Jaké stavy psa používáme a které jsou konečné?

- [ ] 🟡 Které údaje karty psa musí být povinné?

- [ ] 🟡 Jaké kontroly po adopci automaticky plánovat?

- [ ] 🟡 Které uživatelské role budou už ve verzi 1.0?

- [ ] 🟡 Které dokumenty má aplikace automaticky generovat?

- [ ] 🟡 Budou finance vedené kompletně v aplikaci, nebo bude aplikace jen
provozní evidence navázaná na účetnictví?

- [ ] 🟡 Co přesně smí vidět a měnit dočaskář?

- [ ] 🟡 Co přesně smí vidět dobrovolník?

- [ ] 🟡 Které notifikace mají chodit e-mailem a které pouze v aplikaci?

- [ ] 🟡 Které integrace chceme: Google Drive, Kalendář, Gmail, formuláře,
sociální sítě?

- [ ] 🟡 Co musí být hotové před importem historické evidence psů?

# Jak připomínkovat

Ideálně nevpisujte dlouhé diskuze přímo do zadání. Označte konkrétní bod
a použijte „Přidat komentář". Do komentáře napište například „Niki:
potřebuji ještě...", „Terka: tento údaj používáme jinak..." nebo
„Vlastimil: technicky navrhuji...". Tak zůstane hlavní dokument
přehledný a připomínky budou navázané na konkrétní požadavky.
