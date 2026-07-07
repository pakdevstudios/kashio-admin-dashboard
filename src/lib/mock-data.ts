export type OrderStatus =
  | "Processing"
  | "Ready To Pick"
  | "On The Way"
  | "Delivered"
  | "Cancelled";

export type Order = {
  id: string;
  item: string;
  itemEmoji: string;
  business: string;
  businessShort: string;
  price: number;
  contact: string;
  location: string;
  date: string;
  status: OrderStatus;
  rider: string | null;
};

// ---- Orders Management (parcel deliveries) ----
export type DeliveryStatus = "Pending" | "On The Way" | "Delivered";

export type Delivery = {
  id: string;
  customer: string;
  contact: string;
  price: number;
  from: string;
  to: string;
  date: string;
  status: DeliveryStatus;
  rider: string | null;
  /** Human order code, e.g. DLV-1042. */
  code?: string;
  /** What the order contains, e.g. "3 items" or "Parcel". */
  summary?: string;
};

const ADDR = "H89, St21, District Courts, Kashmir";

export const activeDeliveries: Delivery[] = [
  { id: "DLV-1", customer: "Ahmed Hamid", contact: "+923327475849", price: 200, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Pending", rider: null },
  { id: "DLV-2", customer: "Saqib Waheed", contact: "+923327475849", price: 1300, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Pending", rider: null },
  { id: "DLV-3", customer: "Noman Asif", contact: "+923327475849", price: 2400, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "On The Way", rider: "Bilal Yousuf" },
  { id: "DLV-4", customer: "Ali Paracha", contact: "+923327475849", price: 320, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Delivered", rider: "Usman Tariq" },
];

export const completedDeliveries: Delivery[] = [
  { id: "DLV-10", customer: "Ahmed Hamid", contact: "+923327475849", price: 200, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Delivered", rider: "Arshid Farooq" },
  { id: "DLV-11", customer: "Saqib Waheed", contact: "+923327475849", price: 1300, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Delivered", rider: "Usman Tariq" },
  { id: "DLV-12", customer: "Noman Asif", contact: "+923327475849", price: 2400, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Delivered", rider: "Fahad Iqbal" },
  { id: "DLV-13", customer: "Ali Paracha", contact: "+923327475849", price: 320, from: ADDR, to: ADDR, date: "23 Jan, 2026", status: "Delivered", rider: "Bilal Yousuf" },
  { id: "DLV-14", customer: "Imran Khan", contact: "+923327475849", price: 950, from: ADDR, to: ADDR, date: "22 Jan, 2026", status: "Delivered", rider: "Arshid Farooq" },
  { id: "DLV-15", customer: "Hassan Raza", contact: "+923327475849", price: 1750, from: ADDR, to: ADDR, date: "22 Jan, 2026", status: "Delivered", rider: "Usman Tariq" },
  { id: "DLV-16", customer: "Tariq Mehmood", contact: "+923327475849", price: 600, from: ADDR, to: ADDR, date: "22 Jan, 2026", status: "Delivered", rider: "Fahad Iqbal" },
  { id: "DLV-17", customer: "Fahad Ali", contact: "+923327475849", price: 2100, from: ADDR, to: ADDR, date: "21 Jan, 2026", status: "Delivered", rider: "Hamza Sheikh" },
];

// Riders available to be assigned in the "Create Appointment" modal
export type AvailableRider = { id: string; name: string; location: string };

export const availableRiders: AvailableRider[] = [
  { id: "AR-1", name: "Kellan Lutz", location: "Kotli, Kashmir" },
  { id: "AR-2", name: "Usman Ghani", location: "Kotli, Kashmir" },
  { id: "AR-3", name: "Omar Farooq", location: "Kotli, Kashmir" },
  { id: "AR-4", name: "Tariq Mahmood", location: "Kotli, Kashmir" },
  { id: "AR-5", name: "Bilal Khan", location: "Kotli, Kashmir" },
  { id: "AR-6", name: "Samiullah", location: "Kotli, Kashmir" },
  { id: "AR-7", name: "Zain Ali", location: "Kotli, Kashmir" },
  { id: "AR-8", name: "Fahad Mustafa", location: "Kotli, Kashmir" },
  { id: "AR-9", name: "Hassan Raza", location: "Kotli, Kashmir" },
  { id: "AR-10", name: "Adeel Shah", location: "Kotli, Kashmir" },
];

export type Rider = {
  id: string;
  name: string;
  location: string;
  activeRides: number;
};

export const orders: Order[] = [
  { id: "ORD-1042", item: "Masala Fries", itemEmoji: "🍟", business: "Kashio Store", businessShort: "KS", price: 200, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "23 Jan, 2026", status: "Processing", rider: null },
  { id: "ORD-1041", item: "BBQ Pizza", itemEmoji: "🍕", business: "Tahzeeb Bakers", businessShort: "TB", price: 1300, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "23 Jan, 2026", status: "Ready To Pick", rider: null },
  { id: "ORD-1040", item: "Premium Steak", itemEmoji: "🥩", business: "Bar & Bites Cafe", businessShort: "BB", price: 2400, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "23 Jan, 2026", status: "On The Way", rider: "Arshid Farooq" },
  { id: "ORD-1039", item: "Amoxicillin", itemEmoji: "💊", business: "Dwatson", businessShort: "DW", price: 320, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "23 Jan, 2026", status: "On The Way", rider: "Usman Tariq" },
  { id: "ORD-1038", item: "Chicken Karahi", itemEmoji: "🍛", business: "Kolachi", businessShort: "KO", price: 1850, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "22 Jan, 2026", status: "Delivered", rider: "Fahad Iqbal" },
  { id: "ORD-1037", item: "Cold Coffee", itemEmoji: "🥤", business: "Cafe Aylanto", businessShort: "CA", price: 450, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "22 Jan, 2026", status: "Cancelled", rider: null },
  { id: "ORD-1036", item: "Beef Burger", itemEmoji: "🍔", business: "Burger Lab", businessShort: "BL", price: 780, contact: "+923327475849", location: "H89, St21, District Courts, Kashmir", date: "22 Jan, 2026", status: "Delivered", rider: "Arshid Farooq" },
];

export const riders: Rider[] = [
  { id: "RID-21", name: "Zubair Sharif", location: "Kotli, Kashmir", activeRides: 13 },
  { id: "RID-22", name: "Amjid Saleem", location: "Kotli, Kashmir", activeRides: 0 },
  { id: "RID-23", name: "Adeel Waheed", location: "Kotli, Kashmir", activeRides: 13 },
];
