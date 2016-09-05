Tool zur Erfassung von Arbeitsaufwänden.

Features:
- Zwei Berechtigungsstufen
  * Techniker
    # kann zu allen Kunden neue Arbeitsaufwände notieren
    # sieht nur seine eigenen eingetragneen Leistungen
    # kann Projekte und Kunden on-the-fly anlegen
  * Admin: 
    # Sieht die Leistungen aller Techniker
    # Kann alles editieren
- Bearbeitung: Noch nicht abgerechnete Leistunen können beliebig geändert werden
- Historie: Alle Änderungen können nachvollzogen werden
- Native LDAP-Integration (keine lokalen Benutzer möglich)
- Filter nach allen Spalten
- Freie Auswahl der anzuzeigenden Spalten
- Autocomplete für Kunden und Projekte
- Optimierte Druckansicht
- Kompakte oder ausführliche Anzeige bei mehrzeiligen Projektbeschreibungen
- MariaDB-Backend, schätzungsweise trivial portierbar
- ...

Lizenz:
GNU Affero General Public License 3.0
https://www.gnu.org/licenses/agpl-3.0.de.html

Installation:
- x.cgi in das cgi-bin Verzeichnis
- HTML in ein für Browser erreichbares Verzeichnis
- config.pl anpassen mit LDAP und DB informationen

Screenshots:
![Screenshot](/screenshots/1.png?raw=true)
![Screenshot](/screenshots/2.png?raw=true)
![Screenshot](/screenshots/3.png?raw=true)
![Screenshot](/screenshots/4.png?raw=true)
![Screenshot](/screenshots/5.png?raw=true)
![Screenshot](/screenshots/6.png?raw=true)

