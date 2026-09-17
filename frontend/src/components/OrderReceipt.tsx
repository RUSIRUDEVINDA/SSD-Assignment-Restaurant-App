import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { restaurants } from '@/data/restaurants';
import { OrderData } from '@/types';

interface OrderReceiptProps {
  orderData: OrderData;
  orderId: string;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    padding: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
  },
  items: {
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  total: {
    marginTop: 16,
    borderTop: 1,
    paddingTop: 8,
  },
  restaurantLogo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
});

const ReceiptContent = ({ orderData, orderId }: OrderReceiptProps) => {
  const restaurant = restaurants.find(r => r.name === orderData.restaurantName);

  // Transform data to ensure all required fields are present
  const safeOrderData = {
    ...orderData,
    itemsPurchased: orderData.itemsPurchased || [],
    totalAmount: orderData.totalAmount || 0,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {restaurant?.logo && (
            <Image style={styles.restaurantLogo} src={restaurant.logo} />
          )}
          <Text style={styles.title}>Order Receipt</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.text}>#{orderId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Restaurant</Text>
          <Text style={styles.text}>{orderData.restaurantName}</Text>
        </View>

        <View style={[styles.section, styles.items]}>
          <Text style={styles.label}>Items Ordered</Text>
          {safeOrderData.itemsPurchased.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.text}>
                {item.name} (x{item.quantity})
              </Text>
              <Text style={styles.text}>${item.price?.toFixed(2) || 0}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.text}>${safeOrderData.totalAmount?.toFixed(2) || 0}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Customer Details</Text>
          <Text style={styles.text}>Name: {orderData.fullName}</Text>
          <Text style={styles.text}>Email: {orderData.email}</Text>
          <Text style={styles.text}>Phone: {orderData.phoneNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Pickup Time</Text>
          <Text style={styles.text}>{orderData.pickupTime}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Order Status</Text>
          <Text style={styles.text}>
            {orderData.status === 'ready for pickup' ? 'Ready for Pickup' : 
             orderData.status === 'processing' ? 'Processing' : 
             orderData.status === 'confirmed' ? 'Confirmed' :
             orderData.status === 'cancelled' ? 'Cancelled' :
             'Pending'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptContent;
