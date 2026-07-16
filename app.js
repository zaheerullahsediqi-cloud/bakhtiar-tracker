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

// One-time seed of the historical months already on record (offered only if the
// entries collection is empty the first time someone logs in). Each month includes
// the real itemized expense lines from your existing statements.
const HISTORICAL_ENTRIES = [{"truckId": "02", "monthName": "June", "year": 2026, "loads": [{"ref": "402703", "route": "One Way Trailers \u2014 TX \u2192 IL", "amount": 100}, {"ref": "37187938", "route": "TQL \u2014 TX \u2192 WI", "amount": 5100}, {"ref": "558808276", "route": "C.H Robinson \u2014 IN \u2192 CA", "amount": 7500}, {"ref": "728022", "route": "Reliable Transportation Solutions \u2014 CA \u2192 CA", "amount": 700}], "items": [{"desc": "ELD Device", "amount": 170, "category": "other"}, {"desc": "Fuel (1-15 June)", "amount": 625.95, "category": "other"}, {"desc": "Fuel (15-30 June)", "amount": 3854.63, "category": "other"}, {"desc": "Driver Earning Zabi (15-30 June)", "amount": 2460, "category": "driver"}, {"desc": "Driver Earning Bakhtiar (15-30 June)", "amount": 1560, "category": "driver"}, {"desc": "Insurance Down Payment", "amount": 3785, "category": "other"}, {"desc": "Stickers", "amount": 97.43, "category": "other"}, {"desc": "Truck Services", "amount": 2100.52, "category": "other"}, {"desc": "Truck Registration", "amount": 59.5, "category": "other"}, {"desc": "IRP Plates", "amount": 316.32, "category": "other"}, {"desc": "Head Rack", "amount": 500, "category": "other"}, {"desc": "Refrigirator", "amount": 329.05, "category": "other"}, {"desc": "Starps", "amount": 37.88, "category": "other"}, {"desc": "Truck Supplies", "amount": 78.28, "category": "other"}, {"desc": "Coolant", "amount": 71.4, "category": "other"}, {"desc": "Truck oil change & services", "amount": 822, "category": "other"}, {"desc": "Coolant", "amount": 74.66, "category": "other"}, {"desc": "Truck Services", "amount": 2809, "category": "other"}, {"desc": "Trailer repair & maintenance", "amount": 1092.71, "category": "other"}, {"desc": "Delvac ELC", "amount": 48.51, "category": "other"}, {"desc": "Hour Permit", "amount": 54.75, "category": "other"}, {"desc": "Dispatch fee", "amount": 1340, "category": "other"}]}, {"truckId": "02", "monthName": "July", "year": 2026, "loads": [{"ref": "130065870", "route": "Simplified Logistics \u2014 NV \u2192 TX", "amount": 4700}, {"ref": "202466", "route": "Silchuk \u2014 TX \u2192 CA", "amount": 7800}], "items": [{"desc": "Trailer tires", "amount": 1240, "category": "other"}, {"desc": "Remaining June balance", "amount": 8887.59, "category": "other"}, {"desc": "Driver amount", "amount": 1875, "category": "driver"}, {"desc": "Dispatch fee", "amount": 1250, "category": "other"}]}, {"truckId": "03", "monthName": "Annual", "year": 2025, "loads": [], "items": [{"desc": "Print & Cut Truck Signs", "amount": 86.59, "category": "other"}, {"desc": "Truck 03 ELD cable & Device", "amount": 154.5, "category": "other"}, {"desc": "Truck 03 Registration", "amount": 1122.92, "category": "other"}, {"desc": "NM Permit", "amount": 10, "category": "other"}, {"desc": "Pre-pass Safety Alliance", "amount": 200, "category": "other"}, {"desc": "Down Payment", "amount": 6000, "category": "other"}, {"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "Pre-pass", "amount": 23.15, "category": "other"}, {"desc": "Registration title & plate expense", "amount": 1161, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "03", "monthName": "January", "year": 2026, "loads": [], "items": [{"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "Fuel", "amount": 444.16, "category": "other"}, {"desc": "Prepass", "amount": 23.15, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "03", "monthName": "February", "year": 2026, "loads": [{"ref": "144878", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 4000}, {"ref": "35462467", "route": "TQL \u2014 UT \u2192 TX", "amount": 2800}, {"ref": "35487159", "route": "TQL \u2014 TX \u2192 TX", "amount": 725}, {"ref": "145516", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 4500}, {"ref": "35527400", "route": "TQL \u2014 AZ \u2192 LA", "amount": 2550}, {"ref": "0337984", "route": "SET LOGISTICS \u2014 LA \u2192 PA", "amount": 3500}, {"ref": "35545935", "route": "TQL \u2014 MD \u2192 IL", "amount": 1700}, {"ref": "35663779", "route": "TQL \u2014 IL \u2192 TX", "amount": 3300}, {"ref": "146456", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 5000}], "items": [{"desc": "Monthly Insurance Amount", "amount": 2045.13, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Company Domain name for 1 year", "amount": 13.48, "category": "other"}, {"desc": "Adding Truck 03 to CTS System", "amount": 33.09, "category": "other"}, {"desc": "OR Permit", "amount": 89.13, "category": "other"}, {"desc": "Driver Drug Test", "amount": 69, "category": "driver"}, {"desc": "FEUL", "amount": 8151.98, "category": "other"}, {"desc": "Prepass", "amount": 644.45, "category": "other"}, {"desc": "Dispatch fee", "amount": 2807.5, "category": "other"}]}, {"truckId": "03", "monthName": "March", "year": 2026, "loads": [{"ref": "35793363", "route": "TQL \u2014 NV \u2192 WA", "amount": 2350}, {"ref": "35793894", "route": "TQL \u2014 WA \u2192 CA", "amount": 2650}, {"ref": "35597498", "route": "TQL \u2014 CA \u2192 TX", "amount": 3110}, {"ref": "147173", "route": "SILCHUK LOGISTICS \u2014 TX \u2192 NV", "amount": 5200}, {"ref": "35900342", "route": "TQL \u2014 CA \u2192 CA", "amount": 1500}, {"ref": "35916859", "route": "TQL \u2014 CA \u2192 TX", "amount": 3050}, {"ref": "35939410", "route": "TQL \u2014 TX \u2192 CA", "amount": 3850}, {"ref": "35976581", "route": "TQL \u2014 CA \u2192 TX", "amount": 2800}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL", "amount": 7535.37, "category": "other"}, {"desc": "Prepass", "amount": 54.09, "category": "other"}, {"desc": "Lumper fee - port pickup TQL load 35597498", "amount": 110, "category": "other"}, {"desc": "NM Permit", "amount": 10, "category": "other"}, {"desc": "OEM Radiator", "amount": 2143, "category": "other"}, {"desc": "Oil Change with Filters", "amount": 540, "category": "other"}, {"desc": "Tarp", "amount": 1558.8, "category": "other"}, {"desc": "Dispatch fee", "amount": 2451, "category": "other"}]}, {"truckId": "03", "monthName": "April", "year": 2026, "loads": [{"ref": "36202965", "route": "TQL \u2014 TX \u2192 AZ", "amount": 6000}, {"ref": "36191006", "route": "TQL \u2014 AZ \u2192 OH", "amount": 5600}, {"ref": "9524042", "route": "Trinity Logistics, Inc \u2014 OH \u2192 TX", "amount": 4000}, {"ref": "0341679", "route": "COWTOWN LOGISTICS \u2014 TX \u2192 CA", "amount": 4700}, {"ref": "22725748", "route": "RXO \u2014 CA \u2192 TX", "amount": 250}, {"ref": "4251969-1", "route": "Armstrong Transport Group LLC \u2014 CA \u2192 GA", "amount": 5700}, {"ref": "36312002", "route": "TQL \u2014 GA \u2192 TX", "amount": 3300}, {"ref": "36145680", "route": "TQL \u2014 TX \u2192 NV", "amount": 7000}, {"ref": "4792000", "route": "Ascent Global Logistics, LLC \u2014 NV \u2192 TX", "amount": 4500}, {"ref": "36449577", "route": "TQL \u2014 TX \u2192 CA", "amount": 5000}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-16 April)", "amount": 9244.4, "category": "other"}, {"desc": "FEUL (17-30 April)", "amount": 5327.62, "category": "other"}, {"desc": "Prepass", "amount": 243.22, "category": "other"}, {"desc": "Scales", "amount": 14.75, "category": "other"}, {"desc": "Scales Reweigh", "amount": 10, "category": "other"}, {"desc": "Leather Gloves", "amount": 20.27, "category": "other"}, {"desc": "Truck Air leak Repair & Mechanical Service", "amount": 460, "category": "other"}, {"desc": "Parking Lost Ticket Fee", "amount": 175, "category": "other"}, {"desc": "PrePass Deposit", "amount": 200, "category": "other"}, {"desc": "Parts & Mechanic (Trailer 12)", "amount": 541.8, "category": "other"}, {"desc": "Brake Pads (Trailer 12)", "amount": 314.46, "category": "other"}, {"desc": "A/C Compressor Hose", "amount": 202, "category": "other"}, {"desc": "Parts & Mechanic (Trailer 12)", "amount": 630, "category": "other"}, {"desc": "Brake Chamber (Trailer 0004)", "amount": 380, "category": "other"}, {"desc": "Parking Lost Ticket Fee (2)", "amount": 175, "category": "other"}, {"desc": "Scales (2)", "amount": 14.75, "category": "other"}, {"desc": "Scales Reweigh (x3)", "amount": 15, "category": "other"}, {"desc": "Hot Refill", "amount": 1.94, "category": "other"}, {"desc": "Dispatch Fee", "amount": 4605, "category": "other"}]}, {"truckId": "03", "monthName": "May", "year": 2026, "loads": [{"ref": "36486975", "route": "TQL \u2014 CA \u2192 TX", "amount": 4000}, {"ref": "151376", "route": "SILCHUK LOGISTICS LLC \u2014 TX \u2192 NV", "amount": 7500}, {"ref": "36644307", "route": "TQL \u2014 NV \u2192 CA", "amount": 1750}, {"ref": "771021", "route": "First Star Logistics, LLC \u2014 CA \u2192 IL", "amount": 6903}, {"ref": "169466", "route": "KLC Logistics \u2014 IL \u2192 TX", "amount": 3500}, {"ref": "9611469", "route": "Trinity Logistics \u2014 TX \u2192 TX", "amount": 1300}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL", "amount": 9244.4, "category": "other"}, {"desc": "Prepass", "amount": 329.59, "category": "other"}, {"desc": "IFTA", "amount": 134.71, "category": "other"}, {"desc": "Oil Change", "amount": 520, "category": "other"}, {"desc": "Trailer Air Line Accessories", "amount": 43.78, "category": "other"}, {"desc": "Scale (x9)", "amount": 57.25, "category": "other"}, {"desc": "Gate & Credit Card Fees", "amount": 41.2, "category": "other"}, {"desc": "Air Tank & Freight", "amount": 162.38, "category": "other"}, {"desc": "Trailer Expenses", "amount": 667.66, "category": "other"}, {"desc": "Truck Service", "amount": 120.27, "category": "other"}, {"desc": "JB Steel", "amount": 14.46, "category": "other"}, {"desc": "Expenses (Send to Norbadsha)", "amount": 110, "category": "other"}, {"desc": "Parts", "amount": 208.11, "category": "other"}, {"desc": "Grease Tube", "amount": 17.3, "category": "other"}, {"desc": "Mini Fridge", "amount": 314.14, "category": "other"}, {"desc": "Truck Equipment (Truck Freeze Control)", "amount": 58.7, "category": "other"}, {"desc": "Reserve Parking", "amount": 25, "category": "other"}, {"desc": "Dispatch Fee", "amount": 2495.3, "category": "other"}]}, {"truckId": "03", "monthName": "June", "year": 2026, "loads": [{"ref": "37006547", "route": "TQL \u2014 TX \u2192 IL", "amount": 4000}, {"ref": "401669", "route": "ONEWAY TRAILERS \u2014 TX \u2192 IL", "amount": 100}, {"ref": "37054183", "route": "TQL \u2014 IN \u2192 TX", "amount": 3000}, {"ref": "129739", "route": "JORDAN LOGISTICS \u2014 TX \u2192 CA", "amount": 7100}, {"ref": "36914778", "route": "TQL \u2014 CA \u2192 TX", "amount": 4400}, {"ref": "200746", "route": "SILCHUK \u2014 TX \u2192 NV", "amount": 8500}, {"ref": "9662024", "route": "Trinity Logistics \u2014 NV \u2192 TX", "amount": 3000}, {"ref": "37177860", "route": "TQL \u2014 TX \u2192 UT", "amount": 7000}, {"ref": "LD352230", "route": "Kenco Transportation \u2014 UT \u2192 CA", "amount": 2500}, {"ref": "8071503", "route": "AMERICAN MOTORWAYS INC \u2014 CA \u2192 TX", "amount": 4300}, {"ref": "9676917", "route": "Trinity Logistics \u2014 TX \u2192 CA", "amount": 6500}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 250.2, "category": "other"}, {"desc": "FEUL (1-15 June)", "amount": 7329.64, "category": "other"}, {"desc": "FEUL (16-30 June)", "amount": 6934.41, "category": "other"}, {"desc": "Prepass", "amount": 479.28, "category": "other"}, {"desc": "Driver earning (1-15) Farmanullah", "amount": 3937.53, "category": "driver"}, {"desc": "Driver earning (16-30) Farmanullah", "amount": 5707.6, "category": "driver"}, {"desc": "Trailer Light", "amount": 32.46, "category": "other"}, {"desc": "Truck Services", "amount": 418.14, "category": "other"}, {"desc": "Truck Road Services", "amount": 350, "category": "other"}, {"desc": "Towing Services", "amount": 1150, "category": "other"}, {"desc": "Dispatch Fee", "amount": 5040, "category": "other"}]}, {"truckId": "04", "monthName": "June", "year": 2026, "loads": [{"ref": "555700492", "route": "C.H Robinson \u2014 TX \u2192 AZ", "amount": 7000}, {"ref": "37333921", "route": "TQL \u2014 AZ \u2192 FL", "amount": 6200}], "items": [{"desc": "Driver Earnings (15-30 June)", "amount": 3960, "category": "driver"}, {"desc": "ELD", "amount": 85, "category": "other"}, {"desc": "Drug test", "amount": 94, "category": "other"}, {"desc": "Trailer Rent", "amount": 1000, "category": "other"}, {"desc": "Insurance Advance payment", "amount": 3595, "category": "other"}, {"desc": "Choice auto llc", "amount": 1460, "category": "other"}, {"desc": "Choice auto llc", "amount": 1435, "category": "other"}, {"desc": "Trailer equipment", "amount": 1295.38, "category": "other"}, {"desc": "Pre-pass", "amount": 60.05, "category": "other"}, {"desc": "Fuel", "amount": 3261.89, "category": "other"}, {"desc": "Dispatch fee", "amount": 1320, "category": "other"}]}, {"truckId": "05", "monthName": "March", "year": 2026, "loads": [], "items": [{"desc": "ELD Service", "amount": 25.75, "category": "other"}, {"desc": "Drug test", "amount": 94, "category": "other"}, {"desc": "Parts and mechanic", "amount": 410, "category": "other"}, {"desc": "Tarp", "amount": 1558.8, "category": "other"}, {"desc": "Parts and mechanic", "amount": 575, "category": "other"}, {"desc": "Truck rear tires", "amount": 1800, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "05", "monthName": "April", "year": 2026, "loads": [{"ref": "OR511274", "route": "OpenRoad Global \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "4227649-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 OK", "amount": 4000}, {"ref": "3333537", "route": "Max Trans Logistics \u2014 OK \u2192 AZ", "amount": 4200}, {"ref": "4238309-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 NV", "amount": 3000}, {"ref": "OR512345", "route": "OpenRoad Global \u2014 NV \u2192 CA", "amount": 1200}, {"ref": "36300695", "route": "TQL \u2014 CA \u2192 TX", "amount": 4500}, {"ref": "9542985", "route": "Trinity Logistics Inc \u2014 TX \u2192 TX", "amount": 1400}, {"ref": "988505", "route": "FREIGHT TEC \u2014 TX \u2192 CA", "amount": 4200}, {"ref": "4267178-1", "route": "Armstrong Transport Group, LLC \u2014 CA \u2192 TX", "amount": 4200}, {"ref": "150213", "route": "Silchuk Logistics \u2014 TX \u2192 ME", "amount": 7800}, {"ref": "36508577", "route": "TQL \u2014 CT \u2192 NY", "amount": 900}, {"ref": "36539949", "route": "TQL \u2014 NJ \u2192 MO", "amount": 2900}], "items": [{"desc": "Advance payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 April)", "amount": 8321.22, "category": "other"}, {"desc": "Fuel (16-30 April)", "amount": 4380.75, "category": "other"}, {"desc": "Pre-pass", "amount": 254.02, "category": "other"}, {"desc": "Pre-pass deposit", "amount": 200, "category": "other"}, {"desc": "Electric cable", "amount": 135, "category": "other"}, {"desc": "Driver Earnings (1-15)", "amount": 6748, "category": "driver"}, {"desc": "Driver Earnings (16-30)", "amount": 5600, "category": "driver"}, {"desc": "Dispatch Fee", "amount": 4410, "category": "other"}]}, {"truckId": "05", "monthName": "May", "year": 2026, "loads": [{"ref": "4295650-1", "route": "Armstrong Transport Group, LLC \u2014 AR \u2192 TX", "amount": 2700}, {"ref": "36568322", "route": "TQL \u2014 OK \u2192 CA", "amount": 5800}, {"ref": "36607879", "route": "TQL \u2014 CA \u2192 TX", "amount": 3900}, {"ref": "56569", "route": "Purpose Transportation \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "36687021", "route": "TQL \u2014 CA \u2192 TX", "amount": 4300}, {"ref": "36721999", "route": "TQL \u2014 TX \u2192 TX", "amount": 900}, {"ref": "151845", "route": "Silchuk Logistics \u2014 TX \u2192 NV", "amount": 7500}, {"ref": "36792570", "route": "TQL \u2014 UT \u2192 TX", "amount": 2800}, {"ref": "31493-01956", "route": "Jones Transport \u2014 TX \u2192 AZ", "amount": 5300}, {"ref": "121338", "route": "TAG Co INC \u2014 AZ \u2192 CA", "amount": 1600}, {"ref": "26160", "route": "Cowboy's Logistics LLC \u2014 CA \u2192 TX", "amount": 4500}, {"ref": "152364", "route": "Silchuk Logistics \u2014 TX \u2192 NV", "amount": 8500}], "items": [{"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 May)", "amount": 5936.97, "category": "other"}, {"desc": "Fuel(16-30 May)", "amount": 7218.16, "category": "other"}, {"desc": "Pre-pass", "amount": 247.48, "category": "other"}, {"desc": "Driver's Earning (1-15 May)", "amount": 6552, "category": "driver"}, {"desc": "Driver's Earning (16-30 May)", "amount": 8456, "category": "driver"}, {"desc": "Trailer Maintenance & repair", "amount": 908, "category": "other"}, {"desc": "Car Wash", "amount": 107.1, "category": "other"}, {"desc": "Trailer tire", "amount": 530.99, "category": "other"}, {"desc": "Dispatch Fee", "amount": 5360, "category": "other"}]}, {"truckId": "05", "monthName": "June", "year": 2026, "loads": [{"ref": "36950765", "route": "TQL \u2014 NV \u2192 TX", "amount": 3400}, {"ref": "37001776", "route": "TQL \u2014 TX \u2192 CA", "amount": 7200}, {"ref": "329378", "route": "Inter City Direct \u2014 CA \u2192 TX", "amount": 4740}, {"ref": "37083498", "route": "TQL \u2014 TX \u2192 AZ", "amount": 5500}, {"ref": "AGT2273730", "route": "Logistics Plus \u2014 AZ \u2192 TX", "amount": 2800}, {"ref": "37123993", "route": "TQL \u2014 TX \u2192 CA", "amount": 5800}, {"ref": "WT-43853", "route": "US Links Transport INC \u2014 CA \u2192 TX", "amount": 4200}, {"ref": "200922", "route": "Silchuk \u2014 TX \u2192 NV", "amount": 8000}, {"ref": "9662035", "route": "Trinity Logistics, Inc \u2014 NV \u2192 TX", "amount": 3000}, {"ref": "9663207", "route": "Trinity Logistics, Inc \u2014 TX \u2192 AZ", "amount": 5000}, {"ref": "36968120", "route": "TQL \u2014 AZ \u2192 TX", "amount": 2500}, {"ref": "1660445", "route": "C.H Robinson \u2014 TX \u2192 AZ", "amount": 7000}, {"ref": "3126783", "route": "Beemac Logistics \u2014 AZ \u2192 TX", "amount": 4100}, {"ref": "402702", "route": "OneWay Trailers \u2014 TX \u2192 IL", "amount": 100}, {"ref": "SPT-674225", "route": "SPI Logistics \u2014 TX \u2192 MI", "amount": 4600}, {"ref": "912392", "route": "All Pro Freight Systems INC \u2014 IL \u2192 TX", "amount": 4395}, {"ref": "37358579", "route": "TQL \u2014 TX \u2192 TX", "amount": 1750}], "items": [{"desc": "ELD Service (Wali Rahman)", "amount": 175.1, "category": "other"}, {"desc": "Fuel (1-15 June)", "amount": 9188.92, "category": "other"}, {"desc": "Fuel (16-31)", "amount": 6926.81, "category": "other"}, {"desc": "Pre-pass", "amount": 267.95, "category": "other"}, {"desc": "Drivers Earning (1-15)- Zabi & Wali", "amount": 10224.25, "category": "driver"}, {"desc": "Drivers Earning (16-30) Zabi & Wali", "amount": 8141, "category": "driver"}, {"desc": "Philips nuts & bolts", "amount": 6.48, "category": "other"}, {"desc": "Temp tag for Trailer", "amount": 54.75, "category": "other"}, {"desc": "Truck Service", "amount": 1278.92, "category": "other"}, {"desc": "Truck Service", "amount": 5201.98, "category": "other"}, {"desc": "Dispatch Fee", "amount": 7408.5, "category": "other"}]}, {"truckId": "06", "monthName": "March", "year": 2026, "loads": [], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 25.75, "category": "other"}, {"desc": "FEUL", "amount": 0, "category": "other"}, {"desc": "Prepass", "amount": 0, "category": "other"}, {"desc": "Truck Services", "amount": 579.14, "category": "other"}, {"desc": "Truck Services", "amount": 880, "category": "other"}, {"desc": "Prepass Deposit", "amount": 200, "category": "other"}, {"desc": "Dispatch fee", "amount": 0, "category": "other"}]}, {"truckId": "06", "monthName": "April", "year": 2026, "loads": [{"ref": "36217727", "route": "TQL \u2014 TX \u2192 VA", "amount": 6700}, {"ref": "36199256", "route": "TQL \u2014 TN \u2192 NV", "amount": 7100}, {"ref": "549660063", "route": "C.H. Robinson \u2014 NV \u2192 CA", "amount": 1500}, {"ref": "9532698", "route": "Trinity Logistics, Inc \u2014 CA \u2192 WA", "amount": 5200}, {"ref": "14868", "route": "Blue 52 Logistics \u2014 WA \u2192 TX", "amount": 5650}, {"ref": "35971597", "route": "TQL \u2014 TX \u2192 NV", "amount": 4300}, {"ref": "50958", "route": "Iron Peak Solutions \u2014 NV \u2192 TX", "amount": 2950}, {"ref": "36452814", "route": "TQL \u2014 TX \u2192 NV", "amount": 6250}, {"ref": "36564622", "route": "TQL \u2014 CA \u2192 Cancel (TONU)", "amount": 150}], "items": [{"desc": "Advanced Payment for Insurance", "amount": 5154.1, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-16 April)", "amount": 7096.79, "category": "other"}, {"desc": "FEUL (16-30 April)", "amount": 5812.25, "category": "other"}, {"desc": "Prepass", "amount": 190.27, "category": "other"}, {"desc": "Drug Test", "amount": 94, "category": "other"}, {"desc": "Feul", "amount": 800, "category": "other"}, {"desc": "Prepass Deposit", "amount": 200, "category": "other"}, {"desc": "OR Permit", "amount": 156.14, "category": "other"}, {"desc": "Load weight issue for CA to WA", "amount": 1750, "category": "other"}, {"desc": "Last Month's Balance (March)", "amount": 1684.89, "category": "other"}, {"desc": "Driver Mileage (1-15 April)", "amount": 5356.9, "category": "driver"}, {"desc": "Driver Mileage (16-30 April)", "amount": 5482.43, "category": "driver"}, {"desc": "Scales (Paid by Driver) (x2)", "amount": 29.5, "category": "driver"}, {"desc": "Truck Service", "amount": 300.24, "category": "other"}, {"desc": "Truck Services", "amount": 1504.55, "category": "other"}, {"desc": "Truck Maintenance - Oil (Paid by Driver)", "amount": 82.33, "category": "driver"}, {"desc": "Dispatch Fee", "amount": 3980, "category": "other"}]}, {"truckId": "06", "monthName": "May", "year": 2026, "loads": [{"ref": "4013", "route": "TCR Global \u2014 CA \u2192 CA", "amount": 1100}, {"ref": "36597541", "route": "TQL \u2014 CA \u2192 TX", "amount": 4400}, {"ref": "22886879", "route": "TQL \u2014 TX \u2192 CA", "amount": 6200}, {"ref": "552451809", "route": "CHRW Billing \u2014 NV \u2192 CA", "amount": 1218}, {"ref": "32989", "route": "TRIVIUM LOGISTICS \u2014 CA \u2192 TX", "amount": 4100}, {"ref": "9599443", "route": "Trinity Logistics, Inc \u2014 TX \u2192 CA", "amount": 6500}, {"ref": "AUS11634TFC", "route": "Allied Freight Solutions \u2014 CA-AZ \u2192 TX", "amount": 5400}, {"ref": "36870763", "route": "TQL \u2014 TX \u2192 TX", "amount": 1300}, {"ref": "60398350", "route": "ASCENT \u2014 TX \u2192 TX", "amount": 1600}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 175.1, "category": "other"}, {"desc": "FEUL (1-15 May)", "amount": 5651.71, "category": "other"}, {"desc": "FEUL (16-30 May)", "amount": 3954.81, "category": "other"}, {"desc": "Prepass", "amount": 246.67, "category": "other"}, {"desc": "Last Month's Balance (April)", "amount": 49, "category": "other"}, {"desc": "Driver Earning (1-15 May)", "amount": 5105, "category": "driver"}, {"desc": "Driver Earning (16-31 May)", "amount": 4440, "category": "driver"}, {"desc": "Car Wash", "amount": 122.55, "category": "other"}, {"desc": "Trailer Lock (x3)", "amount": 32.44, "category": "other"}, {"desc": "Dispatch Fee", "amount": 3181.8, "category": "other"}]}, {"truckId": "06", "monthName": "June", "year": 2026, "loads": [{"ref": "32805846", "route": "Globaltranz \u2014 NV \u2192 GA", "amount": 7000}, {"ref": "2185448", "route": "Steam Logistics, LLC \u2014 GA \u2192 TX", "amount": 3000}], "items": [{"desc": "Monthly Insurance Amount", "amount": 0, "category": "other"}, {"desc": "ELD Service", "amount": 0, "category": "other"}, {"desc": "FEUL (1-15 June)", "amount": 0, "category": "other"}, {"desc": "FEUL (16-30 June)", "amount": 0, "category": "other"}, {"desc": "Prepass", "amount": 7.9, "category": "other"}, {"desc": "Driver Earning (16-31 May)", "amount": 2633.2, "category": "driver"}, {"desc": "Glad Hand Lock", "amount": 30.3, "category": "other"}, {"desc": "Oil Change", "amount": 580, "category": "other"}, {"desc": "Road Service", "amount": 250, "category": "other"}, {"desc": "Truck Services", "amount": 1000, "category": "other"}, {"desc": "Dispatch Fee", "amount": 1000, "category": "other"}]}];


// ───────────────── State ─────────────────
let entries = [];
let trailerIncomeRows = [];
let paymentRows = [];

// ───────────────── DOM refs ─────────────────
const $ = (sel) => document.querySelector(sel);
const loginScreen = $("#login-screen");
const appScreen = $("#app-screen");
const loginForm = $("#login-form");
const loginError = $("#login-error");
const loginBtn = $("#login-btn");
const userEmailEl = $("#user-email");
const toastEl = $("#toast");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

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
let unsubEntries, unsubTrailer, unsubPayments;

async function maybeSeedHistoricalData() {
  const snap = await getDocs(collection(db, "entries"));
  if (!snap.empty) return;
  if (!confirm("No entries found yet. Load the historical Star Link data (June 2025–July 2026) to get started?")) return;
  for (const row of HISTORICAL_ENTRIES) {
    const payload = { ...row, gross: loadsGrossTotal(row.loads), driver: itemsDriverTotal(row.items), other: itemsOtherTotal(row.items), createdAt: serverTimestamp() };
    await addDoc(collection(db, "entries"), payload);
  }
  showToast("Historical data loaded.");
}

async function resetHistoricalData() {
  if (!confirm("This replaces ALL current months with the original statement data. Any edits or new months you've added will be lost. Continue?")) return;
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
  unsubPayments && unsubPayments();
  entries = []; trailerIncomeRows = []; paymentRows = [];
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
function paymentsTotal() { return paymentRows.reduce((s, r) => s + (Number(r.amount) || 0), 0); }

// ───────────────── Rendering: Dashboard ─────────────────
function renderDashboard() {
  const container = $("#truck-groups");
  container.innerHTML = "";

  TRUCKS.forEach((t) => {
    const truckEntries = entries
      .filter((e) => e.truckId === t.id)
      .sort((a, b) => entryMonthKey(a) - entryMonthKey(b));
    const subtotalShare = truckEntries.reduce((s, e) => s + entryShare(e, t.ownership), 0);

    const group = document.createElement("div");
    group.className = "truck-group";

    const head = document.createElement("div");
    head.className = "truck-group-head";
    head.innerHTML = `
      <span>${t.name}${t.ownership < 1 ? ' <span class="ownership-tag">' + Math.round(t.ownership * 100) + '% share</span>' : ""}</span>
      <span class="subtotal">Subtotal: <b>${money(subtotalShare)}</b></span>
    `;
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
    container.appendChild(group);
  });

  renderSummary();
}

function renderSummary() {
  const share = grandShareTotal();
  const trailer = trailerTotal();
  const owed = share + trailer;
  const sent = paymentsTotal();
  const remaining = owed - sent;
  $("#sum-share").textContent = money(share);
  $("#sum-trailer").textContent = money(trailer);
  $("#sum-sent").textContent = money(sent);
  $("#sum-remaining").textContent = money(remaining);
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
      if (confirm("Delete this trailer income entry?")) await deleteDoc(doc(db, "trailerIncome", r.id));
    });
    tbody.appendChild(tr);
  });
  $("#trailer-total").textContent = money(trailerTotal());
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
      if (confirm("Delete this payment entry?")) await deleteDoc(doc(db, "payments", r.id));
    });
    tbody.appendChild(tr);
  });
  $("#payment-total").textContent = money(running);
}

// ───────────────── Modal: monthly entry ─────────────────
const entryModal = $("#entry-modal");
const entryForm = $("#entry-form");
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

function openEntryModal(entry) {
  $("#entry-id").value = entry ? entry.id : "";
  truckSelect.value = entry ? entry.truckId : TRUCKS[0].id;
  monthNameSelect.value = entry ? entry.monthName : "January";
  $("#entry-year").value = entry ? entry.year : new Date().getFullYear();
  $("#entry-delete").hidden = !entry;

  loadsListEl.innerHTML = "";
  if (entry && entry.loads && entry.loads.length) {
    entry.loads.forEach((l) => addLoadRow(l));
  } else if (entry && entry.gross) {
    // legacy entry saved before the loads table existed — carry the total over as one line
    addLoadRow({ ref: "Legacy total", route: "Not itemized", amount: entry.gross });
  }

  itemsListEl.innerHTML = "";
  if (entry && entry.items && entry.items.length) {
    entry.items.forEach((it) => addItemRow(it));
  } else if (entry && (entry.driver || entry.other)) {
    // legacy entry saved before line items existed — carry the totals over as single lines
    if (entry.driver) addItemRow({ desc: "Driver Payments (legacy total)", amount: entry.driver, category: "driver" });
    if (entry.other) addItemRow({ desc: "Other Expenses (legacy total)", amount: entry.other, category: "other" });
  }

  recalcStatementSummary();
  entryModal.hidden = false;
}

$("#add-entry-btn").addEventListener("click", () => openEntryModal(null));
$("#reset-data-link")?.addEventListener("click", resetHistoricalData);
$("#entry-print").addEventListener("click", () => window.print());

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
    loads,
    items,
    gross: loadsGrossTotal(loads),
    driver: itemsDriverTotal(items),
    other: itemsOtherTotal(items),
  };
  if (id) {
    await updateDoc(doc(db, "entries", id), payload);
    showToast("Statement updated.");
  } else {
    await addDoc(collection(db, "entries"), { ...payload, createdAt: serverTimestamp() });
    showToast("Statement added.");
  }
  entryModal.hidden = true;
});

$("#entry-delete").addEventListener("click", async () => {
  const id = $("#entry-id").value;
  if (id && confirm("Delete this month's entry?")) {
    await deleteDoc(doc(db, "entries", id));
    entryModal.hidden = true;
    showToast("Month deleted.");
  }
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
