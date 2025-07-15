import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InventoryService from '../../services/inventoryService';

interface StockAlert {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock?: number;
  unit: string;
}

export default function StockAlerts({ navigation }: any) {
  const [lowStockProducts, setLowStockProducts] = useState<StockAlert[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'low' | 'out'>('low');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await InventoryService.getStockAlerts();
      setLowStockProducts(response.data.lowStock);
      setOutOfStockProducts(response.data.outOfStock);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las alertas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleQuickOrder = (product: StockAlert) => {
    Alert.alert(
      'Crear Orden de Compra',
      `¿Deseas crear una orden de compra para ${product.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: () => {
            // Navegar al formulario de compra con el producto preseleccionado
            navigation.navigate('PurchaseForm', { 
              preselectedProduct: product 
            });
          }
        }
      ]
    );
  };

  const AlertCard = ({ item, type }: { item: StockAlert; type: 'low' | 'out' }) => (
    <TouchableOpacity
      style={[styles.alertCard, { borderLeftColor: type === 'out' ? '#FF6B6B' : '#FFB74D' }]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertIcon}>
          <Ionicons
            name={type === 'out' ? 'alert-circle' : 'warning'}
            size={24}
            color={type === 'out' ? '#FF6B6B' : '#FFB74D'}
          />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{item.name}</Text>
          <Text style={styles.alertSku}>SKU: {item.sku}</Text>
          <Text style={styles.alertStock}>
            Stock actual: {item.currentStock} {item.unit}
            {type === 'low' && item.minStock && ` (Mínimo: ${item.minStock})`}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.quickOrderButton}
        onPress={() => handleQuickOrder(item)}
      >
        <Ionicons name="cart" size={16} color="white" />
        <Text style={styles.quickOrderText}>Ordenar</Text>
      </TouchableOpacity>
    </TouchableCard>
  );

  const currentData = activeTab === 'low' ? lowStockProducts : outOfStockProducts;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas de Stock</Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading}>
          <Ionicons name="refresh" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'low' && styles.activeTab]}
          onPress={() => setActiveTab('low')}
        >
          <Text style={[styles.tabText, activeTab === 'low' && styles.activeTabText]}>
            Stock Bajo ({lowStockProducts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'out' && styles.activeTab]}
          onPress={() => setActiveTab('out')}
        >
          <Text style={[styles.tabText, activeTab === 'out' && styles.activeTabText]}>
            Sin Stock ({outOfStockProducts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {currentData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={activeTab === 'low' ? 'checkmark-circle' : 'happy'}
            size={64}
            color="#4ECDC4"
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'low' ? '¡Excelente!' : '¡Todo en stock!'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'low' 
              ? 'No hay productos con stock bajo' 
              : 'No hay productos sin stock'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AlertCard item={item} type={activeTab} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#4ECDC4'
  },
  tabText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#4ECDC4',
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 10
  },
  listContainer: {
    padding: 20
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  alertIcon: {
    marginRight: 15
  },
  alertContent: {
    flex: 1
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 5
  },
  alertSku: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 5
  },
  alertStock: {
    fontSize: 14,
    color: '#6C757D'
  },
  quickOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-end'
  },
  quickOrderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5
  }
});
