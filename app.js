import { firebaseConfig } from './firebase-config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ───────────────── Firebase init ─────────────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ───────────────── Business config ─────────────────
// Star Link Freight — Bakhtiar's trucks. Ownership 0.5 = 50/50 shared truck.
const TRUCKS = [
  { id: "02", name: "Truck 02", ownership: 0.5 },
  { id: "03", name: "Truck 03", ownership: 1.0 },
  { id: "04", name: "Truck 04", ownership: 0.5 },
  { id: "05", name: "Truck 05", ownership: 1.0 },
  { id: "06", name: "Truck 06", ownership: 1.0 },
];

const MONTH_NAMES = ["Annual", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ───────────────── PDF statement upload/parsing ─────────────────
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}


// One-time seed of the historical months already on record (offered only if the
// entries collection is empty the first time someone logs in). Each month includes
// the real itemized expense lines from your existing statements.
const HISTORICAL_ENTRIES = [{"truckId": "02", "monthName": "June", "year": 2026, "loads": [{"ref": "402703", "route": "One Way Trailers \u2014 TX \u2192 IL", "amount": 100}, {"ref": "37187938", "route": "TQL \u2014 TX \u2192 WI", "amount": 5100}, {"ref": "558808276", "route": "C.H Robinson \u2014 IN \u2192 CA", "amount": 7500}, {"ref": "728022", "route": "Reliable Transportation Solutions \u2014 CA \u2192 CA", "amount": 700}], "items": [{"desc": "ELD Device", "amount": 170, "category": "other"}, {"desc": "Fuel (1-15 June)", "amount": 625.95, "category": "other"}, {"desc": "Fuel (15-30 June)", "amount": 3854.63, "category": "other"}, {"desc": "Driver Earning Zabi (15-30 June)", "amount": 2460, "category": "driver"}, {"desc": "Driver Earning Bakhtiar (15-30 June)", "amount": 1560, "category": "driver"}, {"desc": "Insurance Down Payment", "amount": 3785, "category": "other"}, {"desc": "Stickers", "amount": 97.43, "category": "other"}, {"desc": "Truck Services", "amount": 2100.52, "category": "other"}, {"desc": "Truck Registration", "amount": 59.5, "category": "other"}, {"desc": "IRP Plates", "amount": 316.32, "category": "other"}, {"desc": "Head Rack", "amount": 500, "category": "other"}, {"desc": "Refrigirator", "amount": 329.05, "category": "other"}, {"desc": "Starps", "amount": 37.88, "category": "other"}, {"desc": "Truck Supplies", "amount": 78.28, "category": "other"}, {"desc": "Coolant", "amount": 71.4, "category": "other"}, {"desc": "Truck oil change & services", "amount": 822, "category": "other"}, {"desc": "Coolant", "amount": 74.66, "category": "other"}, {"desc": "Truck Services", "amount": 2809, "category": "other"}, {"desc": "Trailer repair & maintenance", "amount": 1092.71, "category": "other"}, {"desc": "Delvac ELC", "amount": 48.51, "category": "other"}, {"desc": "Hour Permit", "amount": 54.75, "category": "other"}, {"desc": "Dispatch fee", "amount": 1340, "category": "other"}]}, {"truckId": "02", "monthName": "July", "year": 2026, "loads": [{"ref": "130065870", "route": "Simplified Logistics \u2014 NV \u2192 TX", "amount": 4700}, {"ref": "202466", "route": "Silchuk \u2014 TX \u2192 CA", "amount": 7800}], "items": [{"desc": "Trailer tires", "amount": 1240, "category": "other"}, {"desc": "Remaining June balance", "amount": 8887.59, "category": "other"}, {"desc": "Driver amount", "amount": 1875, "category": "driver"}, {"desc": "Dispatch fee", "amount": 1250, "category": "other"}]}, {"truckId": "03", "monthName": "Annual", "year": 2025, "loads": [], "items": [{"desc": "Print & Cut Truck Signs", "amount": 86.59, "category": "other"}, {"desc": "Truck 03 ELD cable & Device", "amount": 154.5, "category": "other"}, {"desc": "Truck 03 Registration", "amount": 1122.92, "category": "other"}, {"desc": "NM Permit", "amount": 10, "category": "other"}, {"desc": "Pre-pass Safety Alliance", "amount": 200, "category": "other"}, {"desc": "Down Payment", "amount": 6000, "category": "other"}, {"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "Pre-pass", "amount": 23.15, "category": "other"}, {"desc": "Registration title & plate expense", "amount": 1161, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "03", "monthName": "January", "year": 2026, "loads": [], "items": [{"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "Fuel", "amount": 444.16, "category": "other"}, {"desc": "Prepass", "amount": 23.15, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "03", "monthName": "February", "year": 2026, "loads": [{"ref": "144878", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 4000}, {"ref": "35462467", "route": "TQL \u2014 UT \u2192 TX", "amount": 2800}, {"ref": "35487159", "route": "TQL \u2014 TX \u2192 TX", "amount": 725}, {"ref": "145516", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 4500}, {"ref": "35527400", "route": "TQL \u2014 AZ \u2192 LA", "amount": 2550}, {"ref": "0337984", "route": "SET LOGISTICS \u2014 LA \u2192 PA", "amount": 3500}, {"ref": "35545935", "route": "TQL \u2014 MD \u2192 IL", "amount": 1700}, {"ref": "35663779", "route": "TQL \u2014 IL \u2192 TX", "amount": 3300}, {"ref": "146456", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 5000}], "items": [{"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Company Domain name for 1 year", "amount": 13.48, "category": "other"}, {"desc": "Adding Truck 03 to CTS System", "amount": 33.09, "category": "other"}, {"desc": "OR Permit", "amount": 89.13, "category": "other"}, {"desc": "Driver Drug Test", "amount": 69, "category": "driver"}, {"desc": "FEUL", "amount": 8151.98, "category": "other"}, {"desc": "Prepass", "amount": 644.45, "category": "other"}, {"desc": "Dispatch fee", "amount": 2807.5, "category": "other"}]}, {"truckId": "03", "monthName": "March", "year": 2026, "loads": [{"ref": "35793363", "route": "TQL \u2014 NV \u2192 WA", "amount": 2350}, {"ref": "35793894", "route": "TQL \u2014 WA \u2192 CA", "amount": 2650}, {"ref": "35597498", "route": "TQL \u2014 CA \u2192 TX", "amount": 3110}, {"ref": "147173", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 5200}, {"ref": "35900342", "route": "TQL \u2014 CA \u2192 CA", "amount": 1500}, {"ref": "35916859", "route": "TQL \u2014 CA \u2192 TX", "amount": 3050}, {"ref": "35939410", "route": "TQL \u2014 TX \u2192 CA", "amount": 3850}, {"ref": "35976581", "route": "TQL \u2014 CA \u2192 TX", "amount": 2800}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL", "amount": 7535.37, "category": "other"}, {"desc": "Prepass", "amount": 54.09, "category": "other"}, {"desc": "Lumper fee - port pickup TQL load 35597498", "amount": 110, "category": "other"}, {"desc": "NM Permit", "amount": 10, "category": "other"}, {"desc": "OEM Radiator", "amount": 2143, "category": "other"}, {"desc": "Oil Change with Filters", "amount": 540, "category": "other"}, {"desc": "Tarp", "amount": 1558.8, "category": "other"}, {"desc": "Dispatch fee", "amount": 2451, "category": "other"}]}, {"truckId": "03", "monthName": "April", "year": 2026, "loads": [{"ref": "36202965", "route": "TQL \u2014 TX \u2192 AZ", "amount": 6000}, {"ref": "36191006", "route": "TQL \u2014 AZ \u2192 OH", "amount": 5600}, {"ref": "9524042", "route": "Trinity Logistics, Inc \u2014 OH \u2192 TX", "amount": 4000}, {"ref": "0341679", "route": "COWTOWN LOGISTICS \u2014 TX \u2192 CA", "amount": 4700}, {"ref": "22725748", "route": "RXO \u2014 CA \u2192 TX", "amount": 250}, {"ref": "4251969-1", "route": "Armstrong Transport Group LLC \u2014 CA \u2192 GA", "amount": 5700}, {"ref": "36312002", "route": "TQL \u2014 GA \u2192 TX", "amount": 3300}, {"ref": "36145680", "route": "TQL \u2014 TX \u2192 NV", "amount": 7000}, {"ref": "4792000", "route": "Ascent Global Logistics, LLC \u2014 NV \u2192 TX", "amount": 4500}, {"ref": "36449577", "route": "TQL \u2014 TX \u2192 CA", "amount": 5000}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-16 April)", "amount": 9244.4, "category": "other"}, {"desc": "FEUL (17-30 April)", "amount": 5327.62, "category": "other"}, {"desc": "Prepass", "amount": 243.22, "category": "other"}, {"desc": "Scales", "amount": 14.75, "category": "other"}, {"desc": "Scales Reweigh", "amount": 10, "category": "other"}, {"desc": "Leather Gloves", "amount": 20.27, "category": "other"}, {"desc": "Truck Air leak Repair & Mechanical Service", "amount": 460, "category": "other"}, {"desc": "Parking Lost Ticket Fee", "amount": 175, "category": "other"}, {"desc": "PrePass Deposit", "amount": 200, "category": "other"}, {"desc": "Parts & Mechanic (Trailer 12)", "amount": 541.8, "category": "other"}, {"desc": "Brake Pads (Trailer 12)", "amount": 314.46, "category": "other"}, {"desc": "A/C Compressor Hose", "amount": 202, "category": "other"}, {"desc": "Parts & Mechanic (Trailer 12)", "amount": 630, "category": "other"}, {"desc": "Brake Chamber (Trailer 0004)", "amount": 380, "category": "other"}, {"desc": "Parking Lost Ticket Fee (2)", "amount": 175, "category": "other"}, {"desc": "Scales (2)", "amount": 14.75, "category": "other"}, {"desc": "Scales Reweigh (x3)", "amount": 15, "category": "other"}, {"desc": "Hot Refill", "amount": 1.94, "category": "other"}, {"desc": "Dispatch Fee", "amount": 4605, "category": "other"}]}, {"truckId": "03", "monthName": "May", "year": 2026, "loads": [{"ref": "36486975", "route": "TQL \u2014 CA \u2192 TX", "amount": 4000}, {"ref": "151376", "route": "SILCHUK LOGISTICS LLC \u2014 TX \u2192 NV", "amount": 7500}, {"ref": "36644307", "route": "TQL \u2014 NV \u2192 CA", "amount": 1750}, {"ref": "771021", "route": "First Star Logistics, LLC \u2014 CA \u2192 IL", "amount": 6903}, {"ref": "169466", "route": "KLC Logistics \u2014 IL \u2192 TX", "amount": 3500}, {"ref": "9611469", "route": "Trinity Logistics \u2014 TX \u2192 TX", "amount": 1300}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL", "amount": 9244.4, "category": "other"}, {"desc": "Prepass", "amount": 329.59, "category": "other"}, {"desc": "IFTA", "amount": 134.71, "category": "other"}, {"desc": "Oil Change", "amount": 520, "category": "other"}, {"desc": "Trailer Air Line Accessories", "amount": 43.78, "category": "other"}, {"desc": "Scale (x9)", "amount": 57.25, "category": "other"}, {"desc": "Gate & Credit Card Fees", "amount": 41.2, "category": "other"}, {"desc": "Air Tank & Freight", "amount": 162.38, "category": "other"}, {"desc": "Trailer Expenses", "amount": 667.66, "category": "other"}, {"desc": "Truck Service", "amount": 120.27, "category": "other"}, {"desc": "JB Steel", "amount": 14.46, "category": "other"}, {"desc": "Expenses (Send to Norbadsha)", "amount": 110, "category": "other"}, {"desc": "Parts", "amount": 208.11, "category": "other"}, {"desc": "Grease Tube", "amount": 17.3, "category": "other"}, {"desc": "Mini Fridge", "amount": 314.14, "category": "other"}, {"desc": "Truck Equipment (Truck Freeze Control)", "amount": 58.7, "category": "other"}, {"desc": "Reserve Parking", "amount": 25, "category": "other"}, {"desc": "Dispatch Fee", "amount": 2495.3, "category": "other"}]}, {"truckId": "03", "monthName": "June", "year": 2026, "loads": [{"ref": "37006547", "route": "TQL \u2014 TX \u2192 IL", "amount": 4000}, {"ref": "401669", "route": "ONEWAY TRAILERS \u2014 TX \u2192 IL", "amount": 100}, {"ref": "37054183", "route": "TQL \u2014 IN \u2192 TX", "amount": 3000}, {"ref": "129739", "route": "JORDAN LOGISTICS \u2014 TX \u2192 CA", "amount": 7100}, {"ref": "36914778", "route": "TQL \u2014 CA \u2192 TX", "amount": 4400}, {"ref": "200746", "route": "SILCHUK \u2014 TX \u2192 NV", "amount": 8500}, {"ref": "9662024", "route": "Trinity Logistics \u2014 NV \u2192 TX", "amount": 3000}, {"ref": "37177860", "route": "TQL \u2014 TX \u2192 UT", "amount": 7000}, {"ref": "LD352230", "route": "Kenco Transportation \u2014 UT \u2192 CA", "amount": 2500}, {"ref": "8071503", "route": "AMERICAN MOTORWAYS INC \u2014 CA \u2192 TX", "amount": 4300}, {"ref": "9676917", "route": "Trinity Logistics \u2014 TX \u2192 CA", "amount": 6500}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 250.2, "category": "other"}, {"desc": "FEUL (1-15 June)", "amount": 7329.64, "category": "other"}, {"desc": "FEUL (16-30 June)", "amount": 6934.41, "category": "other"}, {"desc": "Prepass", "amount": 479.28, "category": "other"}, {"desc": "Driver earning (1-15) Farmanullah", "amount": 3937.53, "category": "driver"}, {"desc": "Driver earning (16-30) Farmanullah", "amount": 5707.6, "category": "driver"}, {"desc": "Trailer Light", "amount": 32.46, "category": "other"}, {"desc": "Truck Services", "amount": 418.14, "category": "other"}, {"desc": "Truck Road Services", "amount": 350, "category": "other"}, {"desc": "Towing Services", "amount": 1150, "category": "other"}, {"desc": "Dispatch Fee", "amount": 5040, "category": "other"}]}, {"truckId": "04", "monthName": "June", "year": 2026, "loads": [{"ref": "555700492", "route": "C.H Robinson \u2014 TX \u2192 AZ", "amount": 7000}, {"ref": "37333921", "route": "TQL \u2014 AZ \u2192 FL", "amount": 6200}], "items": [{"desc": "Driver Earnings (15-30 June)", "amount": 3960, "category": "driver"}, {"desc": "ELD", "amount": 85, "category": "other"}, {"desc": "Drug test", "amount": 94, "category": "other"}, {"desc": "Trailer Rent", "amount": 1000, "category": "other"}, {"desc": "Insurance Advance payment", "amount": 3595, "category": "other"}, {"desc": "Trailer equipment", "amount": 1295.38, "category": "other"}, {"desc": "Pre-pass", "amount": 60.05, "category": "other"}, {"desc": "Fuel", "amount": 3261.89, "category": "other"}, {"desc": "Dispatch fee", "amount": 1320, "category": "other"}]}, {"truckId": "05", "monthName": "March", "year": 2026, "loads": [], "items": [{"desc": "ELD Service", "amount": 25.75, "category": "other"}, {"desc": "Drug test", "amount": 94, "category": "other"}, {"desc": "Parts and mechanic", "amount": 410, "category": "other"}, {"desc": "Tarp", "amount": 1558.8, "category": "other"}, {"desc": "Parts and mechanic", "amount": 575, "category": "other"}, {"desc": "Truck rear tires", "amount": 1800, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "05", "monthName": "April", "year": 2026, "loads": [{"ref": "OR511274", "route": "OpenRoad Global \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "4227649-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 OK", "amount": 4000}, {"ref": "3333537", "route": "Max Trans Logistics \u2014 OK \u2192 AZ", "amount": 4200}, {"ref": "4238309-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 NV", "amount": 3000}, {"ref": "OR512345", "route": "OpenRoad Global \u2014 NV \u2192 CA", "amount": 1200}, {"ref": "36300695", "route": "TQL \u2014 CA \u2192 TX", "amount": 4500}, {"ref": "9542985", "route": "Trinity Logistics Inc \u2014 TX \u2192 TX", "amount": 1400}, {"ref": "988505", "route": "FREIGHT TEC \u2014 TX \u2192 CA", "amount": 4200}, {"ref": "4267178-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 TX", "amount": 4200}, {"ref": "150213", "route": "Silchuk Logistics \u2014 TX \u2192 ME", "amount": 7800}, {"ref": "36508577", "route": "TQL \u2014 CT \u2192 NY", "amount": 900}, {"ref": "36539949", "route": "TQL \u2014 NJ \u2192 MO", "amount": 2900}], "items": [{"desc": "Advance payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 April)", "amount": 8321.22, "category": "other"}, {"desc": "Fuel (16-30 April)", "amount": 4380.75, "category": "other"}, {"desc": "Pre-pass", "amount": 254.02, "category": "other"}, {"desc": "Pre-pass deposit", "amount": 200, "category": "other"}, {"desc": "Electric cable", "amount": 135, "category": "other"}, {"desc": "Driver Earnings (1-15)", "amount": 6748, "category": "driver"}, {"desc": "Driver Earnings (16-30)", "amount": 5600, "category": "driver"}, {"desc": "Dispatch Fee", "amount": 4410, "category": "other"}]}, {"truckId": "05", "monthName": "May", "year": 2026, "loads": [{"ref": "4295650-1", "route": "Armstrong Transport Group, LLC \u2014 AR \u2192 TX", "amount": 2700}, {"ref": "36568322", "route": "TQL \u2014 OK \u2192 CA", "amount": 5800}, {"ref": "36607879", "route": "TQL \u2014 CA \u2192 TX", "amount": 3900}, {"ref": "56569", "route": "Purpose Transportation \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "36687021", "route": "TQL \u2014 CA \u2192 TX", "amount": 4300}, {"ref": "36721999", "route": "TQL \u2014 TX \u2192 TX", "amount": 900}, {"ref": "151845", "route": "Silchuk Logistics \u2014 TX \u2192 NV", "amount": 7500}, {"ref": "36792570", "route": "TQL \u2014 UT \u2192 TX", "amount": 2800}, {"ref": "31493-01956", "route": "Jones Transport \u2014 TX \u2192 AZ", "amount": 5300}, {"ref": "121338", "route": "TAG Co INC \u2014 AZ \u2192 CA", "amount": 1600}, {"ref": "26160", "route": "Cowboy's Logistics LLC \u2014 CA \u2192 TX", "amount": 4500}, {"ref": "152364", "route": "Silchuk Logistics \u2014 TX \u2192 NV", "amount": 8500}], "items": [{"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 May)", "amount": 5936.97, "category": "other"}, {"desc": "Fuel(16-30 May)", "amount": 7218.16, "category": "other"}, {"desc": "Pre-pass", "amount": 247.48, "category": "other"}, {"desc": "Driver's Earning (1-15 May)", "amount": 6552, "category": "driver"}, {"desc": "Driver's Earning (16-30 May)", "amount": 8456, "category": "driver"}, {"desc": "Trailer Maintenance & repair", "amount": 908, "category": "other"}, {"desc": "Car Wash", "amount": 107.1, "category": "other"}, {"desc": "Trailer tire", "amount": 530.99, "category": "other"}, {"desc": "Dispatch Fee", "amount": 5360, "category": "other"}]}, {"truckId": "05", "monthName": "June", "year": 2026, "loads": [{"ref": "36950765", "route": "TQL \u2014 NV \u2192 TX", "amount": 3400}, {"ref": "37001776", "route": "TQL \u2014 TX \u2192 CA", "amount": 7200}, {"ref": "329378", "route": "Inter City Direct \u2014 CA \u2192 TX", "amount": 4740}, {"ref": "37083498", "route": "TQL \u2014 TX \u2192 AZ", "amount": 5500}, {"ref": "AGT2273730", "route": "Logistics Plus \u2014 AZ \u2192 TX", "amount": 2800}, {"ref": "37123993", "route": "TQL \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "WT-43853", "route": "US Links Transport INC \u2014 CA \u2192 TX", "amount": 4200}, {"ref": "200922", "route": "Silchuk \u2014 TX \u2192 NV", "amount": 8000}, {"ref": "9662035", "route": "Trinity Logistics, Inc \u2014 NV \u2192 TX", "amount": 3000}, {"ref": "9663207", "route": "Trinity Logistics, Inc \u2014 TX \u2192 AZ", "amount": 5000}, {"ref": "36968120", "route": "TQL \u2014 AZ \u2192 TX", "amount": 2500}, {"ref": "1660445", "route": "C.H Robinson \u2014 TX \u2192 AZ", "amount": 7000}, {"ref": "3126783", "route": "Beemac Logistics \u2014 AZ \u2192 TX", "amount": 4100}, {"ref": "402702", "route": "OneWay Trailers \u2014 TX \u2192 IL", "amount": 100}, {"ref": "SPT-674225", "route": "SPI Logistics \u2014 TX \u2192 MI", "amount": 4600}, {"ref": "912392", "route": "All Pro Freight Systems INC \u2014 IL \u2192 TX", "amount": 4395}, {"ref": "37358579", "route": "TQL \u2014 TX \u2192 TX", "amount": 1750}], "items": [{"desc": "ELD Service (Wali Rahman)", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 June)", "amount": 9188.92, "category": "other"}, {"desc": "Fuel (16-31)", "amount": 6926.81, "category": "other"}, {"desc": "Pre-pass", "amount": 267.95, "category": "other"}, {"desc": "Drivers Earning (1-15)- Zabi & Wali", "amount": 10224.25, "category": "driver"}, {"desc": "Drivers Earning (16-30) Zabi & Wali", "amount": 8141, "category": "driver"}, {"desc": "Philips nuts & bolts", "amount": 6.48, "category": "other"}, {"desc": "Temp tag for Trailer", "amount": 54.75, "category": "other"}, {"desc": "Truck Service", "amount": 1278.92, "category": "other"}, {"desc": "Truck Service", "amount": 5201.98, "category": "other"}, {"desc": "Dispatch Fee", "amount": 7408.5, "category": "other"}]}, {"truckId": "06", "monthName": "March", "year": 2026, "loads": [], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 25.75, "category": "other"}, {"desc": "FEUL", "amount": 0, "category": "other"}, {"desc": "Prepass", "amount": 0, "category": "other"}, {"desc": "Truck Services", "amount": 579.14, "category": "other"}, {"desc": "Truck Services", "amount": 880, "category": "other"}, {"desc": "Prepass Deposit", "amount": 200, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "06", "monthName": "April", "year": 2026, "loads": [{"ref": "36217727", "route": "TQL \u2014 TX \u2192 VA", "amount": 6700}, {"ref": "36199256", "route": "TQL \u2014 TN \u2192 NV", "amount": 7100}, {"ref": "549660063", "route": "C.H. Robinson \u2014 NV \u2192 CA", "amount": 1500}, {"ref": "9532698", "route": "Trinity Logistics, Inc \u2014 CA \u2192 WA", "amount": 5200}, {"ref": "14868", "route": "Blue 52 Logistics \u2014 WA \u2192 TX", "amount": 5650}, {"ref": "35971597", "route": "TQL \u2014 TX \u2192 NV", "amount": 4300}, {"ref": "50958", "route": "Iron Peak Solutions \u2014 NV \u2192 TX", "amount": 2950}, {"ref": "36452814", "route": "TQL \u2014 TX \u2192 NV", "amount": 6250}, {"ref": "36564622", "route": "TQL \u2014 CA \u2192 Cancel (TONU)", "amount": 150}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-16 April)", "amount": 7096.79, "category": "other"}, {"desc": "FEUL (16-30 April)", "amount": 5812.25, "category": "other"}, {"desc": "Prepass", "amount": 190.27, "category": "other"}, {"desc": "Drug Test", "amount": 94, "category": "other"}, {"desc": "Feul", "amount": 800, "category": "other"}, {"desc": "Prepass Deposit", "amount": 200, "category": "other"}, {"desc": "OR Permit", "amount": 156.14, "category": "other"}, {"desc": "Load weight issue for CA to WA", "amount": 1750, "category": "other"}, {"desc": "Last Month's Balance (March)", "amount": 1684.89, "category": "other"}, {"desc": "Driver Mileage (1-15 April)", "amount": 5356.9, "category": "driver"}, {"desc": "Driver Mileage (16-30 April)", "amount": 5482.43, "category": "driver"}, {"desc": "Scales (Paid by Driver) (x2)", "amount": 29.5, "category": "driver"}, {"desc": "Truck Service", "amount": 300.24, "category": "other"}, {"desc": "Truck Services", "amount": 1504.55, "category": "other"}, {"desc": "Truck Maintenance - Oil (Paid by Driver)", "amount": 82.33, "category": "driver"}, {"desc": "Dispatch Fee", "amount": 3980, "category": "other"}]}, {"truckId": "06", "monthName": "May", "year": 2026, "loads": [{"ref": "4013", "route": "TCR Global \u2014 CA \u2192 CA", "amount": 1100}, {"ref": "36597541", "route": "TQL \u2014 CA \u2192 TX", "amount": 4400}, {"ref": "22886879", "route": "TQL \u2014 TX \u2192 CA", "amount": 6200}, {"ref": "552451809", "route": "CHRW Billing \u2014 NV \u2192 CA", "amount": 1218}, {"ref": "32989", "route": "TRIVIUM LOGISTICS \u2014 CA \u2192 TX", "amount": 4100}, {"ref": "9599443", "route": "Trinity Logistics, Inc \u2014 TX \u2192 CA", "amount": 6500}, {"ref": "AUS11634TFC", "route": "Allied Freight Solutions \u2014 CA-AZ \u2192 TX", "amount": 5400}, {"ref": "36870763", "route": "TQL \u2014 TX \u2192 TX", "amount": 1300}, {"ref": "60398350", "route": "ASCENT \u2014 TX \u2192 TX", "amount": 1600}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-15 May)", "amount": 5651.71, "category": "other"}, {"desc": "FEUL (16-30 May)", "amount": 3954.81, "category": "other"}, {"desc": "Prepass", "amount": 246.67, "category": "other"}, {"desc": "Last Month's Balance (April)", "amount": 49, "category": "other"}, {"desc": "Driver Earning (1-15 May)", "amount": 5105, "category": "driver"}, {"desc": "Driver Earning (16-31 May)", "amount": 4440, "category": "driver"}, {"desc": "Car Wash", "amount": 122.55, "category": "other"}, {"desc": "Trailer Lock (x3)", "amount": 32.44, "category": "other"}, {"desc": "Dispatch Fee", "amount": 3181.8, "category": "other"}]}, {"truckId": "06", "monthName": "June", "year": 2026, "loads": [{"ref": "32805846", "route": "Globaltranz \u2014 NV \u2192 GA", "amount": 7000}, {"ref": "2185448", "route": "Steam Logistics, LLC \u2014 GA \u2192 TX", "amount": 3000}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 0, "category": "other"}, {"desc": "FEUL (1-15 June)", "amount": 0, "category": "other"}, {"desc": "FEUL (16-30 June)", "amount": 0, "category": "other"}, {"desc": "Prepass", "amount": 7.9, "category": "other"}, {"desc": "Driver Earning (16-31 May)", "amount": 2633.2, "category": "driver"}, {"desc": "Glad Hand Lock", "amount": 30.3, "category": "other"}, {"desc": "Oil Change", "amount": 580, "category": "other"}, {"desc": "Road Service", "amount": 250, "category": "other"}, {"desc": "Truck Services", "amount": 1000, "category": "other"}, {"desc": "Dispatch Fee", "amount": 1000, "category": "other"}]}];


// ───────────────── State ─────────────────
let entries = [];
let expandedTruckId = null;
let trailerIncomeRows = [];
let drivingPayRows = [];
let paymentRows = [];
let currentEntry = null;   // the entry currently open in the modal (null while creating brand new)
const chartInstances = {};

// ───────────────── DOM refs ─────────────────
const $ = (sel) => document.querySelector(sel);
const loginScreen = $("#login-screen");
const appScreen = $("#app-screen");
const loginForm = $("#login-form");
const loginError = $("#login-error");
const loginBtn = $("#login-btn");
const userEmailEl = $("#user-email");
const toastEl = $("#toast");

const TOAST_ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function showToast(msg, variant) {
  toastEl.innerHTML = (variant && TOAST_ICONS[variant] ? TOAST_ICONS[variant] : "") + `<span>${msg}</span>`;
  toastEl.className = "toast" + (variant ? " " + variant : "");
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 2800);
}

// ───────────────── Branded confirm dialog (replaces window.confirm) ─────────────────
function customConfirm(message, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-icon${opts.danger ? " danger" : ""}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button type="button" class="btn-ghost" data-choice="cancel">${opts.cancelLabel || "Cancel"}</button>
          <button type="button" class="${opts.danger ? "btn-danger" : "btn-primary"}" data-choice="ok">${opts.okLabel || "OK"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
      const choice = e.target.closest("[data-choice]");
      if (choice) cleanup(choice.dataset.choice === "ok");
    });
  });
}

// ───────────────── Dark mode ─────────────────
const THEME_KEY = "slf-theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#theme-icon-sun").hidden = theme === "dark";
  $("#theme-icon-moon").hidden = theme !== "dark";
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(preferred);
})();
$("#theme-toggle-btn").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  renderCharts();
});

// ───────────────── Install banner ─────────────────
(function initInstallBanner() {
  const banner = $("#install-banner");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const dismissed = localStorage.getItem("slf-install-dismissed");
  if (isStandalone || dismissed) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferredPrompt = null;

  if (isIOS) {
    $("#install-banner-text").textContent = "Install this app: tap Share, then \"Add to Home Screen\".";
    banner.hidden = false;
  } else {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $("#install-banner-text").textContent = "Install this app on your device for quick access.";
      $("#install-banner-action").hidden = false;
      banner.hidden = false;
    });
  }

  $("#install-banner-action").addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
    banner.hidden = true;
  });
  $("#install-banner-dismiss").addEventListener("click", () => {
    banner.hidden = true;
    localStorage.setItem("slf-install-dismissed", "1");
  });
})();

function money(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ───────────────── Auth ─────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    userEmailEl.textContent = user.email;
    startListeners();
  } else {
    appScreen.hidden = true;
    loginScreen.hidden = false;
    stopListeners();
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in…";
  try {
    await signInWithEmailAndPassword(auth, $("#login-email").value.trim(), $("#login-password").value);
  } catch (err) {
    loginError.textContent = "Couldn't log in — check the email and password.";
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in";
  }
});

$("#logout-btn").addEventListener("click", () => signOut(auth));

// ───────────────── Tabs ─────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ───────────────── Firestore listeners ─────────────────
let unsubEntries, unsubTrailer, unsubDriving, unsubPayments;

async function maybeSeedHistoricalData() {
  const snap = await getDocs(collection(db, "entries"));
  if (!snap.empty) return;
  if (!(await customConfirm("No entries found yet. Load the historical Star Link data to get started?"))) return;
  for (const row of HISTORICAL_ENTRIES) {
    const payload = { ...row, gross: loadsGrossTotal(row.loads), driver: itemsDriverTotal(row.items), other: itemsOtherTotal(row.items), createdAt: serverTimestamp() };
    await addDoc(collection(db, "entries"), payload);
  }
  showToast("Historical data loaded.");
}

async function resetHistoricalData() {
  if (!(await customConfirm("This replaces ALL current months with the original statement data. Any edits or new months you've added will be lost. Continue?", { danger: true, okLabel: "Reload data" }))) return;
  const snap = await getDocs(collection(db, "entries"));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "entries", d.id));
  }
  for (const row of HISTORICAL_ENTRIES) {
    const payload = { ...row, gross: loadsGrossTotal(row.loads), driver: itemsDriverTotal(row.items), other: itemsOtherTotal(row.items), createdAt: serverTimestamp() };
    await addDoc(collection(db, "entries"), payload);
  }
  showToast("Reloaded original statement data.");
}

function startListeners() {
  unsubEntries = onSnapshot(collection(db, "entries"), (snap) => {
    entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderDashboard();
  });
  unsubTrailer = onSnapshot(query(collection(db, "trailerIncome"), orderBy("createdAt", "asc")), (snap) => {
    trailerIncomeRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTrailer();
    renderSummary();
  });
  unsubDriving = onSnapshot(query(collection(db, "drivingPay"), orderBy("createdAt", "asc")), (snap) => {
    drivingPayRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderDriving();
    renderSummary();
  });
  unsubPayments = onSnapshot(query(collection(db, "payments"), orderBy("date", "asc")), (snap) => {
    paymentRows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderPayments();
    renderSummary();
  });
  maybeSeedHistoricalData();
}

function stopListeners() {
  unsubEntries && unsubEntries();
  unsubTrailer && unsubTrailer();
  unsubDriving && unsubDriving();
  unsubPayments && unsubPayments();
  entries = []; trailerIncomeRows = []; drivingPayRows = []; paymentRows = [];
}

// ───────────────── Derived totals ─────────────────
function itemsDriverTotal(items) { return (items || []).filter(i => i.category === "driver").reduce((s, i) => s + (Number(i.amount) || 0), 0); }
function itemsOtherTotal(items) { return (items || []).filter(i => i.category === "other").reduce((s, i) => s + (Number(i.amount) || 0), 0); }
function loadsGrossTotal(loads) { return (loads || []).reduce((s, l) => s + (Number(l.amount) || 0), 0); }
function entryGrossTotal(e) { return e.loads && e.loads.length ? loadsGrossTotal(e.loads) : (Number(e.gross) || 0); }
function entryDriverTotal(e) { return e.items && e.items.length ? itemsDriverTotal(e.items) : (Number(e.driver) || 0); }
function entryOtherTotal(e) { return e.items && e.items.length ? itemsOtherTotal(e.items) : (Number(e.other) || 0); }
function entryNet(e) { return entryGrossTotal(e) - entryDriverTotal(e) - entryOtherTotal(e); }
function entryShare(e, ownership) { return entryNet(e) * ownership; }
function entryMonthKey(e) { return (Number(e.year) || 0) * 100 + MONTH_NAMES.indexOf(e.monthName); }
function entryMonthLabel(e) { return e.monthName === "Annual" ? `Annual ${e.year}` : `${e.monthName} ${e.year}`; }

function grandShareTotal() {
  return TRUCKS.reduce((sum, t) => {
    const truckEntries = entries.filter((e) => e.truckId === t.id);
    const truckShare = truckEntries.reduce((s, e) => s + entryShare(e, t.ownership), 0);
    return sum + truckShare;
  }, 0);
}
function trailerTotal() { return trailerIncomeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0); }
function drivingTotal() { return drivingPayRows.reduce((s, r) => s + (Number(r.amount) || 0), 0); }
function paymentsTotal() { return paymentRows.reduce((s, r) => s + (Number(r.amount) || 0), 0); }

// ───────────────── Rendering: Dashboard ─────────────────
function renderDashboard() {
  const cardsContainer = $("#truck-cards");
  cardsContainer.innerHTML = "";

  TRUCKS.forEach((t) => {
    const truckEntries = entries.filter((e) => e.truckId === t.id);
    const subtotalShare = truckEntries.reduce((s, e) => s + entryShare(e, t.ownership), 0);

    const card = document.createElement("div");
    card.className = "truck-card" + (expandedTruckId === t.id ? " active" : "");
    card.innerHTML = `
      <div class="truck-card-name">
        <span>${t.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      ${t.ownership < 1 ? `<span class="ownership-tag">${Math.round(t.ownership * 100)}% share</span>` : ""}
      <div class="truck-card-months">${truckEntries.length} month${truckEntries.length === 1 ? "" : "s"} logged</div>
      <div class="truck-card-subtotal${subtotalShare < 0 ? " negative" : ""}">${money(subtotalShare)}</div>
    `;
    card.addEventListener("click", () => {
      expandedTruckId = expandedTruckId === t.id ? null : t.id;
      renderDashboard();
    });
    cardsContainer.appendChild(card);
  });

  renderExpandedTruckPanel();
  renderSummary();
}

function renderExpandedTruckPanel() {
  const panel = $("#expanded-truck-panel");
  panel.innerHTML = "";
  if (!expandedTruckId) return;

  const t = TRUCKS.find((x) => x.id === expandedTruckId);
  const truckEntries = entries
    .filter((e) => e.truckId === t.id)
    .sort((a, b) => entryMonthKey(a) - entryMonthKey(b));

  const group = document.createElement("div");
  group.className = "truck-group";

  const head = document.createElement("div");
  head.className = "truck-group-head";
  head.innerHTML = `<span>${t.name} — Monthly Statements</span>`;
  group.appendChild(head);

  if (truckEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = "No months logged yet for this truck.";
    group.appendChild(empty);
  } else {
    truckEntries.forEach((e) => {
      const net = entryNet(e);
      const share = entryShare(e, t.ownership);
      const row = document.createElement("div");
      row.className = "entry-row";
      row.innerHTML = `
        <div>
          <div class="entry-month">${entryMonthLabel(e)}</div>
          <div class="entry-breakdown">Gross ${money(entryGrossTotal(e))} · Driver ${money(entryDriverTotal(e))} · Other ${money(entryOtherTotal(e))} · Net ${money(net)}${e.items && e.items.length ? ` · ${e.items.length} expense line${e.items.length === 1 ? "" : "s"}` : ""}</div>
        </div>
        <div class="entry-share">${money(share)}${t.ownership < 1 ? "<small>Bakhtiar's share</small>" : ""}</div>
      `;
      row.addEventListener("click", () => openEntryModal(e));
      group.appendChild(row);
    });
  }
  panel.appendChild(group);
}

function renderSummary() {
  const share = grandShareTotal();
  const trailer = trailerTotal();
  const driving = drivingTotal();
  const owed = share + trailer + driving;
  const sent = paymentsTotal();
  const remaining = owed - sent;
  $("#sum-share").textContent = money(share);
  $("#sum-trailer").textContent = money(trailer);
  $("#sum-driving").textContent = money(driving);
  $("#sum-sent").textContent = money(sent);
  $("#sum-remaining").textContent = money(remaining);
  renderCharts();
}

// ───────────────── Charts ─────────────────
function upsertChart(canvasId, type, data, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new window.Chart(canvas, {
    type, data,
    options: Object.assign({ responsive: true, maintainAspectRatio: false }, options),
  });
}

function renderCharts() {
  if (!window.Chart) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const textColor = isDark ? "#A6A3BC" : "#6B6B78";

  const truckLabels = TRUCKS.map((t) => t.name.replace("Truck ", "T"));
  const truckShares = TRUCKS.map((t) => entries.filter((e) => e.truckId === t.id).reduce((s, e) => s + entryShare(e, t.ownership), 0));
  upsertChart("chart-truck-share", "bar", {
    labels: truckLabels,
    datasets: [{ data: truckShares, backgroundColor: truckShares.map((v) => (v < 0 ? "#B8324C" : "#4F4080")), borderRadius: 4, maxBarThickness: 34 }],
  }, {
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.parsed.y) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: (v) => "$" + (v / 1000).toFixed(0) + "k" } },
    },
  });

  const monthMap = {};
  entries.forEach((e) => {
    const t = TRUCKS.find((x) => x.id === e.truckId);
    if (!t) return;
    const key = entryMonthKeyRaw(e.monthName, e.year);
    if (!monthMap[key]) monthMap[key] = { label: entryMonthLabel(e).replace(" 20", " '"), total: 0 };
    monthMap[key].total += entryShare(e, t.ownership);
  });
  const sortedKeys = Object.keys(monthMap).map(Number).sort((a, b) => a - b);
  upsertChart("chart-monthly-trend", "line", {
    labels: sortedKeys.map((k) => monthMap[k].label),
    datasets: [{ data: sortedKeys.map((k) => monthMap[k].total), borderColor: "#4F4080", backgroundColor: "rgba(79,64,128,0.14)", fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: "#4F4080" }],
  }, {
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => money(ctx.parsed.y) } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, callback: (v) => "$" + (v / 1000).toFixed(0) + "k" } },
    },
  });

  const share = grandShareTotal();
  const trailer = trailerTotal();
  const driving = drivingTotal();
  upsertChart("chart-income-sources", "doughnut", {
    labels: ["Truck Share", "Trailer Rent", "Driving Pay"],
    datasets: [{ data: [Math.max(share, 0), Math.max(trailer, 0), Math.max(driving, 0)], backgroundColor: ["#4F4080", "#B8860B", "#1F7A3F"], borderWidth: 0 }],
  }, {
    plugins: { legend: { position: "bottom", labels: { color: textColor, font: { size: 10.5 }, boxWidth: 10, padding: 10 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` } } },
    cutout: "62%",
  });
}

// ───────────────── Rendering: Trailer income ─────────────────
function renderTrailer() {
  const tbody = $("#trailer-rows");
  tbody.innerHTML = "";
  if (trailerIncomeRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No trailer rental income logged yet.</td></tr>`;
  }
  trailerIncomeRows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.month || ""}</td>
      <td>${r.truck || ""}</td>
      <td>${r.note || ""}</td>
      <td class="num">${money(r.amount)}</td>
      <td><button class="row-delete" title="Delete" data-id="${r.id}">&times;</button></td>
    `;
    tr.querySelector(".row-delete").addEventListener("click", async () => {
      if (await customConfirm("Delete this trailer income entry?", { danger: true, okLabel: "Delete" })) await deleteDoc(doc(db, "trailerIncome", r.id));
    });
    tbody.appendChild(tr);
  });
  $("#trailer-total").textContent = money(trailerTotal());
}

// ───────────────── Rendering: Driving pay ─────────────────
function renderDriving() {
  const tbody = $("#driving-rows");
  tbody.innerHTML = "";
  if (drivingPayRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No driving pay logged yet.</td></tr>`;
  }
  drivingPayRows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.month || ""}</td>
      <td>${r.truck || ""}</td>
      <td>${r.note || ""}</td>
      <td class="num">${money(r.amount)}</td>
      <td><button class="row-delete" title="Delete" data-id="${r.id}">&times;</button></td>
    `;
    tr.querySelector(".row-delete").addEventListener("click", async () => {
      if (await customConfirm("Delete this driving pay entry?", { danger: true, okLabel: "Delete" })) await deleteDoc(doc(db, "drivingPay", r.id));
    });
    tbody.appendChild(tr);
  });
  $("#driving-total").textContent = money(drivingTotal());
}

// ───────────────── Rendering: Payments ─────────────────
function renderPayments() {
  const tbody = $("#payment-rows");
  tbody.innerHTML = "";
  if (paymentRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No payments logged yet.</td></tr>`;
  }
  let running = 0;
  paymentRows.forEach((r) => {
    running += Number(r.amount) || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date || ""}</td>
      <td>${r.note || ""}</td>
      <td class="num">${money(r.amount)}</td>
      <td class="num">${money(running)}</td>
      <td><button class="row-delete" title="Delete" data-id="${r.id}">&times;</button></td>
    `;
    tr.querySelector(".row-delete").addEventListener("click", async () => {
      if (await customConfirm("Delete this payment entry?", { danger: true, okLabel: "Delete" })) await deleteDoc(doc(db, "payments", r.id));
    });
    tbody.appendChild(tr);
  });
  $("#payment-total").textContent = money(running);
}

// ───────────────── Modal: monthly entry (view + edit) ─────────────────
const entryModal = $("#entry-modal");
const entryForm = $("#entry-form");
const statementView = $("#statement-view");
const truckSelect = $("#entry-truck");
const monthNameSelect = $("#entry-month-name");
TRUCKS.forEach((t) => {
  const opt = document.createElement("option");
  opt.value = t.id;
  opt.textContent = t.name + (t.ownership < 1 ? ` (${Math.round(t.ownership * 100)}% share)` : "");
  truckSelect.appendChild(opt);
});
MONTH_NAMES.forEach((m) => {
  const opt = document.createElement("option");
  opt.value = m;
  opt.textContent = m;
  monthNameSelect.appendChild(opt);
});

const itemsListEl = $("#entry-items-list");
const loadsListEl = $("#entry-loads-list");

function currentTruckOwnership() {
  const t = TRUCKS.find((t) => t.id === truckSelect.value);
  return t ? t.ownership : 1.0;
}
function dispatchFee(amount) { return (Number(amount) || 0) * 0.10; }
const MONTH_ABBR = { January: "JAN", February: "FEB", March: "MAR", April: "APR", May: "MAY", June: "JUN", July: "JUL", August: "AUG", September: "SEP", October: "OCT", November: "NOV", December: "DEC" };

function statementNumber(entry) {
  const unit = (entry.unitTruck || "").replace(/\D/g, "") || entry.truckId;
  const abbr = MONTH_ABBR[entry.monthName] || "ANN";
  return `SLF-${unit}-${abbr}${entry.year}`;
}
function statementDateLabel(entry) {
  if (entry.monthName === "Annual" || !MONTH_ABBR[entry.monthName]) return `31-Dec-${String(entry.year).slice(-2)}`;
  const monthIdx = MONTH_NAMES.indexOf(entry.monthName); // matches JS 0-indexed NEXT month, day 0 = last day of this month
  const d = new Date(entry.year, monthIdx, 0);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" });
  return `${day}-${mon}-${String(entry.year).slice(-2)}`;
}

function downloadStatementPDF(entry) {
  if (!entry) return;
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("PDF generator didn't load — check your connection and try again.", "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const truck = TRUCKS.find((t) => t.id === entry.truckId) || TRUCKS[0];
  const loads = entry.loads && entry.loads.length ? entry.loads : (entry.gross ? [{ ref: "Legacy total", route: "Not itemized", amount: entry.gross }] : []);
  const items = entry.items && entry.items.length ? entry.items : [
    ...(entry.driver ? [{ desc: "Driver Payments (legacy total)", amount: entry.driver, category: "driver" }] : []),
    ...(entry.other ? [{ desc: "Other Expenses (legacy total)", amount: entry.other, category: "other" }] : []),
  ];
  const gross = loadsGrossTotal(loads);
  const dispatchTotal = loads.reduce((s, l) => s + dispatchFee(l.amount), 0);
  const driver = itemsDriverTotal(items);
  const other = itemsOtherTotal(items);
  const net = gross - driver - other;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFillColor(61, 49, 99);
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("STAR LINK FREIGHT INC", margin, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("MC 1757440  |  USDOT 4457566  |  8710 Datapoint Dr #6004, San Antonio, TX 78229", margin, 48);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("EARNING STATEMENT", margin, 68);

  let y = 104;
  doc.setTextColor(33, 32, 43);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("PREPARED FOR", margin, y);
  doc.setFontSize(14);
  doc.text(truck.name, margin, y + 18);

  doc.setFontSize(9);
  const metaX = pageWidth - margin - 210;
  const metaRows = [
    ["Statement No.", statementNumber(entry)],
    ["Statement Date", statementDateLabel(entry)],
    ["Pay Period", entry.monthName === "Annual" ? `Annual ${entry.year}` : `${entry.monthName} ${entry.year}`],
    ["Unit / Truck", entry.unitTruck || truck.name],
  ];
  let my = y - 6;
  metaRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold"); doc.text(label, metaX, my);
    doc.setFont("helvetica", "normal"); doc.text(String(val), metaX + 95, my);
    my += 14;
  });

  y = 158;
  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Load / Ref", "Route / Broker", "Amount", "Dispatch Fee"]],
    body: loads.length ? loads.map((l, i) => [i + 1, l.ref || "", l.route || "", money(l.amount), money(dispatchFee(l.amount))]) : [["", "No loads listed.", "", "", ""]],
    theme: "grid",
    styles: { font: "helvetica", lineColor: [227, 224, 236], lineWidth: 0.5 },
    headStyles: { fillColor: [237, 234, 246], textColor: [61, 49, 99], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [33, 32, 43] },
    columnStyles: { 0: { cellWidth: 20 }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  y = doc.lastAutoTable.finalY + 4;

  doc.setFillColor(237, 234, 246);
  doc.rect(margin, y, pageWidth - 2 * margin, 22, "F");
  doc.setTextColor(61, 49, 99); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("GROSS REVENUE", margin + 6, y + 15);
  doc.text(money(gross), pageWidth - margin - 95, y + 15, { align: "right" });
  doc.text(money(dispatchTotal), pageWidth - margin - 6, y + 15, { align: "right" });
  y += 34;

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Description", "Amount"]],
    body: items.length ? items.map((it) => [it.desc || "", money(it.amount)]) : [["No deductions listed.", ""]],
    theme: "grid",
    styles: { font: "helvetica", lineColor: [227, 224, 236], lineWidth: 0.5 },
    headStyles: { fillColor: [237, 234, 246], textColor: [61, 49, 99], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [33, 32, 43] },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0 && /driver/i.test(String(data.cell.raw))) {
        data.cell.styles.textColor = [31, 122, 63];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = doc.lastAutoTable.finalY + 12;

  const boxHeight = truck.ownership < 1 ? 92 : 76;
  doc.setFillColor(237, 234, 246);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 4, 4, "F");
  let sy = y + 18;
  const summaryLine = (label, val, bold, color) => {
    doc.setTextColor.apply(doc, color || [33, 32, 43]);
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 11 : 9.5);
    doc.text(label, margin + 12, sy);
    doc.text(val, pageWidth - margin - 12, sy, { align: "right" });
    sy += bold ? 18 : 15;
  };
  summaryLine("Gross Revenue", money(gross));
  summaryLine("Driver Payments", "-" + money(driver));
  summaryLine("Other Expenses", "-" + money(other));
  summaryLine("NET EARNINGS", money(net), true);
  if (truck.ownership < 1) {
    summaryLine(`Bakhtiar's Share (${Math.round(truck.ownership * 100)}%)`, money(net * truck.ownership), true, [31, 122, 63]);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(107, 107, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Thank you for partnering with Star Link Freight Inc.", pageWidth / 2, pageHeight - 40, { align: "center" });
  doc.text("For any questions regarding this statement, please contact us at starlinkfreightinc@gmail.com.", pageWidth / 2, pageHeight - 28, { align: "center" });

  doc.save(`${truck.name.replace(/\s+/g, "_")}_${entry.monthName}${entry.year}_Statement.pdf`);
  showToast("PDF downloaded.", "success");
}

function recalcStatementSummary() {
  const loadRows = [...loadsListEl.querySelectorAll(".load-row")];
  const gross = loadRows.reduce((s, row) => s + (parseFloat(row.querySelector(".load-amount").value) || 0), 0);

  const itemRows = [...itemsListEl.querySelectorAll(".item-row")];
  let driver = 0, other = 0;
  itemRows.forEach((row) => {
    const amt = parseFloat(row.querySelector(".item-amount").value) || 0;
    if (row.querySelector(".item-category").value === "driver") driver += amt; else other += amt;
  });

  const totalDeductions = driver + other;
  const net = gross - totalDeductions;
  const ownership = currentTruckOwnership();

  $("#calc-gross").textContent = money(gross);
  $("#calc-driver").textContent = money(driver);
  $("#calc-other").textContent = money(other);
  $("#sum-gross-line").textContent = money(gross);
  $("#sum-deductions-line").textContent = money(totalDeductions);
  $("#sum-net-line").textContent = money(net);

  const shareRow = $("#summary-share-row");
  if (ownership < 1) {
    shareRow.hidden = false;
    $("#summary-share-label").textContent = `Bakhtiar's Share (${Math.round(ownership * 100)}%)`;
    $("#sum-share-line").textContent = money(net * ownership);
  } else {
    shareRow.hidden = true;
  }
}

function addLoadRow(load) {
  const row = document.createElement("div");
  row.className = "load-row";
  row.innerHTML = `
    <input type="text" class="load-ref" placeholder="Load # / Reference" value="${load ? (load.ref || "").toString().replace(/"/g, "&quot;") : ""}">
    <input type="text" class="load-route" placeholder="Broker — Route (e.g. C.H Robinson — TX \u2192 AZ)" value="${load ? (load.route || "").replace(/"/g, "&quot;") : ""}">
    <div class="load-row-line2">
      <input type="number" step="0.01" class="load-amount" placeholder="Amount" value="${load ? load.amount : ""}">
      <button type="button" class="item-remove no-print" aria-label="Remove load">&times;</button>
    </div>
  `;
  row.querySelector(".load-amount").addEventListener("input", recalcStatementSummary);
  row.querySelector(".item-remove").addEventListener("click", () => { row.remove(); recalcStatementSummary(); });
  loadsListEl.appendChild(row);
}

function addItemRow(item) {
  const row = document.createElement("div");
  row.className = "item-row" + (item && item.category === "driver" ? " item-driver" : "");
  row.innerHTML = `
    <input type="text" class="item-desc" placeholder="Description (e.g. Fuel)" value="${item ? (item.desc || "").replace(/"/g, "&quot;") : ""}">
    <div class="item-row-line2">
      <input type="number" step="0.01" class="item-amount" placeholder="Amount" value="${item ? item.amount : ""}">
      <select class="item-category">
        <option value="other"${!item || item.category !== "driver" ? " selected" : ""}>Other expense</option>
        <option value="driver"${item && item.category === "driver" ? " selected" : ""}>Driver payment</option>
      </select>
      <button type="button" class="item-remove" aria-label="Remove line">&times;</button>
    </div>
  `;
  row.querySelector(".item-amount").addEventListener("input", recalcStatementSummary);
  row.querySelector(".item-category").addEventListener("change", () => {
    row.classList.toggle("item-driver", row.querySelector(".item-category").value === "driver");
    recalcStatementSummary();
  });
  row.querySelector(".item-remove").addEventListener("click", () => { row.remove(); recalcStatementSummary(); });
  itemsListEl.appendChild(row);
}

$("#add-load-btn").addEventListener("click", () => { addLoadRow(null); recalcStatementSummary(); });
$("#add-item-btn").addEventListener("click", () => { addItemRow(null); recalcStatementSummary(); });
truckSelect.addEventListener("change", recalcStatementSummary);

// ── View mode rendering (matches the branded PDF) ──
function renderStatementView(entry) {
  const truck = TRUCKS.find((t) => t.id === entry.truckId) || TRUCKS[0];
  const loads = entry.loads && entry.loads.length ? entry.loads : (entry.gross ? [{ ref: "Legacy total", route: "Not itemized", amount: entry.gross }] : []);
  const items = entry.items && entry.items.length ? entry.items : [
    ...(entry.driver ? [{ desc: "Driver Payments (legacy total)", amount: entry.driver, category: "driver" }] : []),
    ...(entry.other ? [{ desc: "Other Expenses (legacy total)", amount: entry.other, category: "other" }] : []),
  ];

  const gross = loadsGrossTotal(loads);
  const dispatchTotal = loads.reduce((s, l) => s + dispatchFee(l.amount), 0);
  const driver = itemsDriverTotal(items);
  const other = itemsOtherTotal(items);
  const totalDed = driver + other;
  const net = gross - totalDed;

  $("#view-truck-name").textContent = truck.name;
  $("#view-stmt-no").textContent = statementNumber(entry);
  $("#view-stmt-date").textContent = statementDateLabel(entry);
  $("#view-pay-period").textContent = entry.monthName === "Annual" ? `Annual ${entry.year}` : `${entry.monthName} ${entry.year}`;
  $("#view-unit-truck").textContent = entry.unitTruck || truck.name;

  $("#view-loads-body").innerHTML = loads.length ? loads.map((l, i) => `
    <tr><td>${i + 1}</td><td>${l.ref || ""}</td><td>${l.route || ""}</td><td class="num">${money(l.amount)}</td><td class="num">${money(dispatchFee(l.amount))}</td></tr>
  `).join("") : `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);">No loads listed.</td></tr>`;
  $("#view-gross").textContent = money(gross);
  $("#view-dispatch-total").textContent = money(dispatchTotal);

  $("#view-items-body").innerHTML = items.length ? items.map((it) => `
    <tr${it.category === "driver" ? ' style="color:var(--green);font-weight:600;"' : ""}><td>${it.desc || ""}</td><td class="num">${money(it.amount)}</td></tr>
  `).join("") : `<tr><td colspan="2" style="text-align:center;color:var(--ink-soft);">No deductions listed.</td></tr>`;
  $("#view-sum-gross").textContent = money(gross);
  $("#view-sum-deductions").textContent = "-" + money(totalDed);
  $("#view-total-deductions").textContent = money(totalDed);
  $("#view-net").textContent = money(net);

  const shareRow = $("#view-share-row");
  if (truck.ownership < 1) {
    shareRow.hidden = false;
    $("#view-share-label").textContent = `Bakhtiar's Share (${Math.round(truck.ownership * 100)}%)`;
    $("#view-share-value").textContent = money(net * truck.ownership);
  } else {
    shareRow.hidden = true;
  }

  $("#entry-delete-view").hidden = false;
}

function showView() {
  statementView.hidden = false;
  entryForm.hidden = true;
}
function showEdit() {
  statementView.hidden = true;
  entryForm.hidden = false;
}

function populateEditForm(entry) {
  $("#entry-id").value = entry ? entry.id : "";
  truckSelect.value = entry ? entry.truckId : TRUCKS[0].id;
  monthNameSelect.value = entry ? entry.monthName : "January";
  $("#entry-year").value = entry ? entry.year : new Date().getFullYear();
  $("#entry-unit-truck").value = entry ? (entry.unitTruck || "") : "";
  $("#entry-delete").hidden = !entry;

  loadsListEl.innerHTML = "";
  if (entry && entry.loads && entry.loads.length) {
    entry.loads.forEach((l) => addLoadRow(l));
  } else if (entry && entry.gross) {
    addLoadRow({ ref: "Legacy total", route: "Not itemized", amount: entry.gross });
  }

  itemsListEl.innerHTML = "";
  if (entry && entry.items && entry.items.length) {
    entry.items.forEach((it) => addItemRow(it));
  } else if (entry && (entry.driver || entry.other)) {
    if (entry.driver) addItemRow({ desc: "Driver Payments (legacy total)", amount: entry.driver, category: "driver" });
    if (entry.other) addItemRow({ desc: "Other Expenses (legacy total)", amount: entry.other, category: "other" });
  }

  recalcStatementSummary();
}

function openEntryModal(entry) {
  currentEntry = entry || null;
  if (entry) {
    renderStatementView(entry);
    showView();
  } else {
    populateEditForm(null);
    showEdit();
  }
  entryModal.hidden = false;
}

$("#add-entry-btn").addEventListener("click", () => openEntryModal(null));
$("#reset-data-link")?.addEventListener("click", resetHistoricalData);
$("#entry-print").addEventListener("click", () => downloadStatementPDF(currentEntry));

$("#entry-edit-btn").addEventListener("click", () => {
  populateEditForm(currentEntry);
  showEdit();
});

$("#entry-cancel-edit").addEventListener("click", () => {
  if (currentEntry) {
    renderStatementView(currentEntry);
    showView();
  } else {
    entryModal.hidden = true;
  }
});

entryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#entry-id").value;

  const loads = [...loadsListEl.querySelectorAll(".load-row")]
    .map((row) => ({
      ref: row.querySelector(".load-ref").value.trim(),
      route: row.querySelector(".load-route").value.trim(),
      amount: parseFloat(row.querySelector(".load-amount").value) || 0,
    }))
    .filter((l) => l.ref || l.route || l.amount);

  const items = [...itemsListEl.querySelectorAll(".item-row")]
    .map((row) => ({
      desc: row.querySelector(".item-desc").value.trim(),
      amount: parseFloat(row.querySelector(".item-amount").value) || 0,
      category: row.querySelector(".item-category").value,
    }))
    .filter((it) => it.desc || it.amount);

  const payload = {
    truckId: truckSelect.value,
    monthName: monthNameSelect.value,
    year: parseInt($("#entry-year").value, 10) || new Date().getFullYear(),
    unitTruck: $("#entry-unit-truck").value.trim(),
    loads,
    items,
    gross: loadsGrossTotal(loads),
    driver: itemsDriverTotal(items),
    other: itemsOtherTotal(items),
  };
  let savedEntry;
  if (id) {
    await updateDoc(doc(db, "entries", id), payload);
    savedEntry = { id, ...payload };
    showToast("Statement updated.");
  } else {
    const ref = await addDoc(collection(db, "entries"), { ...payload, createdAt: serverTimestamp() });
    savedEntry = { id: ref.id, ...payload };
    showToast("Statement added.");
  }
  currentEntry = savedEntry;
  expandedTruckId = savedEntry.truckId;
  renderStatementView(savedEntry);
  showView();
});

async function deleteCurrentEntry() {
  const id = currentEntry ? currentEntry.id : $("#entry-id").value;
  if (id && (await customConfirm("Delete this month's entry? This can't be undone.", { danger: true, okLabel: "Delete" }))) {
    await deleteDoc(doc(db, "entries", id));
    entryModal.hidden = true;
    showToast("Month deleted.");
  }
}
$("#entry-delete").addEventListener("click", deleteCurrentEntry);
$("#entry-delete-view").addEventListener("click", deleteCurrentEntry);

// ───────────────── Modal: driving pay ─────────────────
const drivingModal = $("#driving-modal");
$("#add-driving-btn").addEventListener("click", () => {
  $("#driving-form").reset();
  drivingModal.hidden = false;
});
$("#driving-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "drivingPay"), {
    month: $("#driving-month").value.trim(),
    truck: $("#driving-truck").value.trim(),
    note: $("#driving-note").value.trim(),
    amount: parseFloat($("#driving-amount").value) || 0,
    createdAt: serverTimestamp(),
  });
  drivingModal.hidden = true;
  showToast("Driving pay logged.");
});

// ───────────────── Modal: trailer income ─────────────────
const trailerModal = $("#trailer-modal");
$("#add-trailer-btn").addEventListener("click", () => {
  $("#trailer-form").reset();
  trailerModal.hidden = false;
});
$("#trailer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "trailerIncome"), {
    month: $("#trailer-month").value.trim(),
    truck: $("#trailer-truck").value.trim(),
    note: $("#trailer-note").value.trim(),
    amount: parseFloat($("#trailer-amount").value) || 0,
    createdAt: serverTimestamp(),
  });
  trailerModal.hidden = true;
  showToast("Trailer income logged.");
});

// ───────────────── Modal: payment ─────────────────
const paymentModal = $("#payment-modal");
$("#add-payment-btn").addEventListener("click", () => {
  $("#payment-form").reset();
  $("#payment-date").valueAsDate = new Date();
  paymentModal.hidden = false;
});
$("#payment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "payments"), {
    date: $("#payment-date").value,
    note: $("#payment-note").value.trim(),
    amount: parseFloat($("#payment-amount").value) || 0,
    createdAt: serverTimestamp(),
  });
  paymentModal.hidden = true;
  showToast("Payment logged.");
});

// ───────────────── Modal close (shared) ─────────────────
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => { btn.closest(".modal-overlay").hidden = true; });
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });
});

// ───────────────── Export to Excel ─────────────────
function exportToExcel() {
  if (!window.XLSX) {
    showToast("Excel export didn't load — check your connection and try again.", "error");
    return;
  }

  const entryRows = entries.map((e) => {
    const t = TRUCKS.find((x) => x.id === e.truckId) || { name: e.truckId, ownership: 1 };
    const net = entryNet(e);
    return {
      Truck: t.name,
      Month: e.monthName,
      Year: e.year,
      "Gross Revenue": entryGrossTotal(e),
      "Driver Payments": entryDriverTotal(e),
      "Other Expenses": entryOtherTotal(e),
      "Net Earnings": net,
      "Ownership %": Math.round(t.ownership * 100) + "%",
      "Bakhtiar's Share": entryShare(e, t.ownership),
    };
  }).sort((a, b) => a.Truck.localeCompare(b.Truck) || entryMonthKeyRaw(a.Month, a.Year) - entryMonthKeyRaw(b.Month, b.Year));

  const trailerRows = trailerIncomeRows.map((r) => ({ Month: r.month, "Truck Renting": r.truck, Note: r.note, Amount: r.amount }));
  const drivingRows = drivingPayRows.map((r) => ({ Month: r.month, Truck: r.truck, Note: r.note, Amount: r.amount }));
  const paymentRowsOut = (() => {
    let running = 0;
    return paymentRows.map((r) => {
      running += Number(r.amount) || 0;
      return { Date: r.date, "Note / Method": r.note, "Amount Sent": r.amount, "Balance After": running };
    });
  })();

  const share = grandShareTotal();
  const trailer = trailerTotal();
  const driving = drivingTotal();
  const owed = share + trailer + driving;
  const sent = paymentsTotal();
  const summaryRows = [
    { Item: "Bakhtiar's Share — Trucks", Amount: share },
    { Item: "Trailer Rental Income", Amount: trailer },
    { Item: "Bakhtiar's Driving Pay", Amount: driving },
    { Item: "Total Owed to Bakhtiar", Amount: owed },
    { Item: "Total Sent to Bakhtiar", Amount: sent },
    { Item: "Remaining Balance Owed", Amount: owed - sent },
  ];

  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(summaryRows), "Summary");
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(entryRows), "Truck Earnings");
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(trailerRows), "Trailer Income");
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(drivingRows), "Driving Pay");
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(paymentRowsOut), "Payments");

  const dateStr = new Date().toISOString().slice(0, 10);
  window.XLSX.writeFile(wb, `Bakhtiar_Tracker_Export_${dateStr}.xlsx`);
  showToast("Excel file downloaded.", "success");
}
function entryMonthKeyRaw(monthName, year) { return (Number(year) || 0) * 100 + MONTH_NAMES.indexOf(monthName); }

$("#export-btn").addEventListener("click", exportToExcel);

// ───────────────── Upload Statement (PDF) ─────────────────
const MONTH_NUM = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

async function extractPdfLines(file) {
  const buf = await file.arrayBuffer();
  const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items = content.items
    .map((it) => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }))
    .filter((it) => it.str.trim() !== "");

  const rows = [];
  for (const it of items) {
    let row = rows.find((r) => Math.abs(r.y - it.y) <= 2);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  rows.sort((a, b) => b.y - a.y); // top to bottom
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim());
}

function parseStatementLines(lines) {
  const result = { truckId: null, monthName: null, year: null, loads: [], items: [] };

  for (const l of lines) {
    const m = l.match(/Truck\s+(\d{1,3})\b/);
    if (m) { result.truckId = m[1].padStart(2, "0"); break; }
  }

  for (const l of lines) {
    const m = l.match(/Pay Period\s+([A-Za-z]+)\s+(\d{4})/);
    if (m && MONTH_NUM[m[1]]) { result.monthName = m[1]; result.year = parseInt(m[2], 10); break; }
  }

  const loadRe = /^(\d+)\s+(\S+)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([A-Za-z]{2}\s*(?:\u2192|->|-)\s*[A-Za-z]{2})\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})\s*$/;
  for (const l of lines) {
    const m = l.match(loadRe);
    if (m) {
      result.loads.push({
        ref: m[2],
        route: `${m[5].trim()} \u2014 ${m[6].replace(/\s+/g, " ").trim()}`,
        amount: parseFloat(m[7].replace(/,/g, "")),
      });
    }
  }

  let inDeductions = false;
  const dedRe = /^(.+?)\s+\$([\d,]+\.\d{2})(?:\s|$)/;
  for (const l of lines) {
    if (/^DESCRIPTION\s+AMOUNT/.test(l)) { inDeductions = true; continue; }
    if (/^TOTAL DEDUCTIONS/.test(l)) { inDeductions = false; continue; }
    if (!inDeductions) continue;
    const m = l.match(dedRe);
    if (m) {
      const desc = m[1].trim();
      const amount = parseFloat(m[2].replace(/,/g, ""));
      result.items.push({ desc, amount, category: /driver/i.test(desc) ? "driver" : "other" });
    }
  }

  return result;
}

$("#upload-statement-btn").addEventListener("click", () => $("#upload-statement-input").click());

$("#upload-statement-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  if (!window.pdfjsLib) {
    showToast("PDF reader didn't load — check your connection and try again.");
    return;
  }

  showToast("Reading statement\u2026");
  try {
    const lines = await extractPdfLines(file);
    const parsed = parseStatementLines(lines);

    if (!parsed.loads.length && !parsed.items.length) {
      showToast("Couldn't read any loads or expenses from that PDF — try entering it manually.");
      return;
    }

    const truckMatch = TRUCKS.find((t) => t.id === parsed.truckId);
    if (!truckMatch) {
      showToast(`Read the statement, but couldn't match "Truck ${parsed.truckId || "?"}" \u2014 pick the right truck before saving.`);
    } else if (!parsed.monthName) {
      showToast("Read the statement, but couldn't find the month \u2014 double check before saving.");
    } else {
      showToast(`Read ${parsed.loads.length} load${parsed.loads.length === 1 ? "" : "s"} and ${parsed.items.length} expense line${parsed.items.length === 1 ? "" : "s"} \u2014 review and save.`);
    }

    currentEntry = null;
    populateEditForm({
      id: "",
      truckId: truckMatch ? truckMatch.id : TRUCKS[0].id,
      monthName: parsed.monthName || "January",
      year: parsed.year || new Date().getFullYear(),
      unitTruck: "",
      loads: parsed.loads,
      items: parsed.items,
    });
    entryModal.hidden = false;
    showEdit();
    $("#entry-delete").hidden = true;
  } catch (err) {
    console.error(err);
    showToast("Couldn't read that PDF \u2014 try entering the statement manually.");
  }
});
