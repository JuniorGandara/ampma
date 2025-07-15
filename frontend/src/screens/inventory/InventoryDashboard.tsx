import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InventoryService from '../../services/inventoryService';

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingPurchases: number;
}

export default function InventoryDashboard({ navigation }: any) {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingPurchases: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [productsRes, alertsRes, purchasesRes] = await Promise.all([
        InventoryService.getProducts({ limit: 1 }),
        InventoryService.getStockAlerts(),
        InventoryService.getPurchases({ status: 'PENDIENTE', limit: 1 })
      ]);

      setStats({
        totalProducts: productsRes.data.pagination.total,
        lowStockCount: alertsRes.data.summary.lowStockCount,
        outOfStockCount: alertsRes.data.summary.outOfStockCount,
        pendingPurchases: purchasesRes.data.pagination.total
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos del inventario');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, color, icon, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statContent}>
        <View style={styles.statText}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
        </View>
        <Ionicons name={icon} size={24} color={color} />
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inventario</Text>
          <TouchableOpacity onPress={() => navigation.navigate('StockAlerts')}>
            <View style={styles.alertBadge}>
              <Ionicons name="notifications" size={20} color="#FF6B6B" />
              {(stats.lowStockCount + stats.outOfStockCount) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {stats.lowStockCount + stats.outOfStockCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Productos"
            value={stats.totalProducts}
            color="#4ECDC4"
            icon="cube-outline"
            onPress={() => navigation.navigate('ProductList')}
          />
          <StatCard
            title="Stock Bajo"
            value={stats.lowStockCount}
            color="#FFB74D"
            icon="warning-outline"
            onPress={() => navigation.navigate('StockAlerts')}
          />
          <StatCard
            title="Sin Stock"
            value={stats.outOfStockCount}
            color="#FF6B6B"
            icon="alert-circle-outline"
            onPress={() => navigation.navigate('StockAlerts')}
          />
          <StatCard
            title="Compras Pendientes"
            value={stats.pendingPurchases}
            color="#9C27B0"
            icon="clipboard-outline"
            onPress={() => navigation.navigate('PurchaseList')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.quickActionsContainer}>
            <QuickAction
              title="Nuevo Producto"
              icon="add-circle"
              color="#4ECDC4"
              onPress={() => navigation.navigate('ProductForm')}
            />
            <QuickAction
              title="Nueva Compra"
              icon="cart"
              color="#9C27B0"
              onPress={() => navigation.navigate('PurchaseForm')}
            />
            <QuickAction
              title="Ajustar Stock"
              icon="settings"
              color="#FF9800"
              onPress={() => navigation.navigate('StockAdjustment')}
            />
            <QuickAction
              title="Movimientos"
              icon="swap-horizontal"
              color="#2196F3"
              onPress={() => navigation.navigate('StockMovements')}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StockMovements')}>
              <Text style={styles.seeAllText}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          {/* TODO: Agregar lista de movimientos recientes */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
  alertBadge: {
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsContainer: {
    padding: 20
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statText: {
    flex: 1
  },
  statTitle: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 5
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50'
  },
  seeAllText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '500'
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  quickAction: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center'
  }
});
