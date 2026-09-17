
import { Table } from "../types";

// Only Barista, Pizza Hut and Coffee Bean have reservations
export const tables: Table[] = [
  // Barista Tables
  {
    id: "table-1-1",
    restaurantId: "1",
    number: 1,
    capacity: 2,
    seats: [
      { id: "seat-1-1-1", tableId: "table-1-1", number: 1, isAvailable: true },
      { id: "seat-1-1-2", tableId: "table-1-1", number: 2, isAvailable: true }
    ]
  },
  {
    id: "table-1-2",
    restaurantId: "1",
    number: 2,
    capacity: 4,
    seats: [
      { id: "seat-1-2-1", tableId: "table-1-2", number: 1, isAvailable: true },
      { id: "seat-1-2-2", tableId: "table-1-2", number: 2, isAvailable: true },
      { id: "seat-1-2-3", tableId: "table-1-2", number: 3, isAvailable: false },
      { id: "seat-1-2-4", tableId: "table-1-2", number: 4, isAvailable: true }
    ]
  },
  {
    id: "table-1-3",
    restaurantId: "1",
    number: 3,
    capacity: 6,
    seats: [
      { id: "seat-1-3-1", tableId: "table-1-3", number: 1, isAvailable: true },
      { id: "seat-1-3-2", tableId: "table-1-3", number: 2, isAvailable: true },
      { id: "seat-1-3-3", tableId: "table-1-3", number: 3, isAvailable: true },
      { id: "seat-1-3-4", tableId: "table-1-3", number: 4, isAvailable: true },
      { id: "seat-1-3-5", tableId: "table-1-3", number: 5, isAvailable: true },
      { id: "seat-1-3-6", tableId: "table-1-3", number: 6, isAvailable: true }
    ]
  },
  // Pizza Hut Tables
  {
    id: "table-2-1",
    restaurantId: "2",
    number: 1,
    capacity: 2,
    seats: [
      { id: "seat-2-1-1", tableId: "table-2-1", number: 1, isAvailable: true },
      { id: "seat-2-1-2", tableId: "table-2-1", number: 2, isAvailable: true }
    ]
  },
  {
    id: "table-2-2",
    restaurantId: "2",
    number: 2,
    capacity: 4,
    seats: [
      { id: "seat-2-2-1", tableId: "table-2-2", number: 1, isAvailable: true },
      { id: "seat-2-2-2", tableId: "table-2-2", number: 2, isAvailable: false },
      { id: "seat-2-2-3", tableId: "table-2-2", number: 3, isAvailable: false },
      { id: "seat-2-2-4", tableId: "table-2-2", number: 4, isAvailable: true }
    ]
  },
  {
    id: "table-2-3",
    restaurantId: "2",
    number: 3,
    capacity: 8,
    seats: [
      { id: "seat-2-3-1", tableId: "table-2-3", number: 1, isAvailable: true },
      { id: "seat-2-3-2", tableId: "table-2-3", number: 2, isAvailable: true },
      { id: "seat-2-3-3", tableId: "table-2-3", number: 3, isAvailable: true },
      { id: "seat-2-3-4", tableId: "table-2-3", number: 4, isAvailable: true },
      { id: "seat-2-3-5", tableId: "table-2-3", number: 5, isAvailable: true },
      { id: "seat-2-3-6", tableId: "table-2-3", number: 6, isAvailable: true },
      { id: "seat-2-3-7", tableId: "table-2-3", number: 7, isAvailable: true },
      { id: "seat-2-3-8", tableId: "table-2-3", number: 8, isAvailable: true }
    ]
  },
  // Coffee Bean Tables
  {
    id: "table-4-1",
    restaurantId: "4",
    number: 1,
    capacity: 2,
    seats: [
      { id: "seat-4-1-1", tableId: "table-4-1", number: 1, isAvailable: true },
      { id: "seat-4-1-2", tableId: "table-4-1", number: 2, isAvailable: true }
    ]
  },
  {
    id: "table-4-2",
    restaurantId: "4",
    number: 2,
    capacity: 2,
    seats: [
      { id: "seat-4-2-1", tableId: "table-4-2", number: 1, isAvailable: false },
      { id: "seat-4-2-2", tableId: "table-4-2", number: 2, isAvailable: false }
    ]
  },
  {
    id: "table-4-3",
    restaurantId: "4",
    number: 3,
    capacity: 4,
    seats: [
      { id: "seat-4-3-1", tableId: "table-4-3", number: 1, isAvailable: true },
      { id: "seat-4-3-2", tableId: "table-4-3", number: 2, isAvailable: true },
      { id: "seat-4-3-3", tableId: "table-4-3", number: 3, isAvailable: true },
      { id: "seat-4-3-4", tableId: "table-4-3", number: 4, isAvailable: true }
    ]
  }
];

export const getTablesByRestaurant = (restaurantId: string): Table[] => {
  return tables.filter(table => table.restaurantId === restaurantId);
};
