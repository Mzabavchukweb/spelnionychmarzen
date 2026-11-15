// Dane osiedla. Źródła: rzuty i tabele pomieszczeń TUES 06.2025 (typy A, A1, B, C), PZT etapu 1a, opis inwestycji (cena 8 900 zł/m²),
// plan z dopiskami od inwestora 12.11.2026 (sprzedane 4B i 5B). W docelowej stronie te dane przyjdą z panelu.
window.TYPY = {
  A1: {
    nazwa: 'A1', pow: 120.06, sypialnie: 4, budynki: [1],
    parter: [['Przedsionek', 5.88], ['Komunikacja', 2.73], ['WC', 4.22], ['Pokój dzienny ze schodami', 20.60], ['Kuchnia', 10.36], ['Garaż', 17.11]],
    parterRazem: 60.91,
    pietro: [['Komunikacja ze schodami', 6.58], ['Sypialnia', 11.28], ['Sypialnia', 11.50], ['Sypialnia', 12.94], ['Łazienka', 6.11], ['Sypialnia', 10.74]],
    pietroRazem: 59.15
  },
  A: {
    nazwa: 'A', pow: 125.89, sypialnie: 4, budynki: [2],
    parter: [['Przedsionek', 5.88], ['Komunikacja', 2.73], ['WC', 4.19], ['Pokój dzienny ze schodami', 20.60], ['Kuchnia', 10.36], ['Spiżarnia', 2.35], ['Garaż', 17.60], ['Pomieszczenie techniczne', 2.86]],
    parterRazem: 66.74,
    pietro: [['Komunikacja ze schodami', 6.58], ['Sypialnia', 11.28], ['Sypialnia', 11.50], ['Sypialnia', 12.94], ['Łazienka', 6.11], ['Sypialnia', 10.74]],
    pietroRazem: 59.15
  },
  B: {
    nazwa: 'B', pow: 127.19, sypialnie: 3, budynki: [4, 5, 7],
    parter: [['Przedsionek', 4.86], ['Pomieszczenie gospodarcze', 3.63], ['WC', 2.82], ['Pokój dzienny ze schodami', 28.75], ['Kuchnia', 6.89], ['Komunikacja', 3.24], ['Garderoba', 3.21], ['Garaż', 22.13]],
    parterRazem: 75.53,
    pietro: [['Komunikacja', 6.80], ['Sypialnia', 15.96], ['Sypialnia', 11.22], ['Sypialnia', 10.43], ['Łazienka', 7.25]],
    pietroRazem: 51.66
  },
  C: {
    nazwa: 'C', pow: 122.45, sypialnie: 4, budynki: [3, 6, 8],
    parter: [['Przedsionek', 4.89], ['Komunikacja', 2.24], ['WC', 2.35], ['Pokój dzienny ze schodami', 22.28], ['Kuchnia', 7.95], ['Pomieszczenie techniczne', 5.24], ['Garaż', 17.17]],
    parterRazem: 62.12,
    pietro: [['Komunikacja ze schodami', 7.50], ['Sypialnia', 13.14], ['Sypialnia', 14.67], ['Sypialnia', 9.30], ['Sypialnia', 10.06], ['Łazienka', 5.66]],
    pietroRazem: 60.33
  }
};

window.CENA_M2 = 8900;

// Wizualizacje budynków do karty domu (plik w img/, np. 'wiz-typ-b.webp'). Pusta wartość = karta bez zdjęcia.
// Prompty do wygenerowania: prompty-wizualizacje-domow.md
window.WIZ_TYPOW = { A1: '', A: '', B: '', C: '' };

// status: wolny | rezerwacja | sprzedany
window.DOMY = [
  { id: "1A1'", typ: 'A1', budynek: 1, status: 'wolny' },
  { id: '1A1', typ: 'A1', budynek: 1, status: 'wolny' },
  { id: "2A'", typ: 'A', budynek: 2, status: 'wolny' },
  { id: '2A', typ: 'A', budynek: 2, status: 'wolny' },
  { id: "3C'", typ: 'C', budynek: 3, status: 'wolny' },
  { id: '3C', typ: 'C', budynek: 3, status: 'wolny' },
  { id: "4B'", typ: 'B', budynek: 4, status: 'wolny' },
  { id: '4B', typ: 'B', budynek: 4, status: 'sprzedany' },
  { id: "5B'", typ: 'B', budynek: 5, status: 'wolny' },
  { id: '5B', typ: 'B', budynek: 5, status: 'sprzedany' },
  { id: '6C', typ: 'C', budynek: 6, status: 'wolny' },
  { id: "6C'", typ: 'C', budynek: 6, status: 'wolny' },
  { id: '7B', typ: 'B', budynek: 7, status: 'wolny' },
  { id: "7B'", typ: 'B', budynek: 7, status: 'wolny' },
  { id: '8C', typ: 'C', budynek: 8, status: 'wolny' },
  { id: "8C'", typ: 'C', budynek: 8, status: 'wolny' }
];

window.STATUSY = { wolny: 'Wolny', rezerwacja: 'Rezerwacja', sprzedany: 'Sprzedany' };

window.slug = function (id) { return id.toLowerCase().replace("'", '-prim'); };
window.zl = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł'; };
window.m2 = function (n) { return n.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' m²'; };
