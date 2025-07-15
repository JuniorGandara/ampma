import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import InventoryService, { StockMovement } from '../../services/inventoryService';

export default function StockMovements({ navigation }: any) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true
  });

  useEffect(() => {
    loadMovements(true);
  }, [filters]);

  const loadMovements = async (reset = false) => {
    try {
      const page = reset ? 1 : pagination.page;
      
      const params: any = {
        page,
        limit: 20
      };

      if (filters.type) params.type = filters.type;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom.toISOString();
      if (filters.dateTo) params.dateTo = filters.dateTo.toISOString();

      const response = await InventoryService.getStockMovements(params);
      const newMovements = response.data.movements;
      
      if (reset) {
        setMovements(newMovements);
      } else {
        setMovements(prev => [...prev, ...newMovements]);
      }

      setPagination({
        page: page + 1,
        hasMore: page < response.data.pagination.pages
      });
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMovements(true);
  };

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      loadMovements();
    }
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      dateFrom: null,
      dateTo: null
    });
  };

  const getMovementIcon = (type: string) => {
    const icons: any = {
      COMPRA: 'arrow-down-circle',
      VENTA: 'arrow-up-circle',
      USO_TRATAMIENTO: 'medical',
      AJUSTE: 'settings',
      VENCIMIENTO: 'time',
      DEVOLUCION: 'return-up-back'
    };
    return icons[type] || 'swap-horizontal';
  };

  const getMovementColor = (type: string) => {
    const colors: any = {
      COMPRA: '#28A745',
      VENTA: '#FF6B6B',
      USO_TRATAMIENTO: '#FFB74D',
      AJUSTE: '#4ECDC4',
      VENCIMIENTO: '#DC3545',
      DEVOLUCION: '#6C757D'
    };
    return colors[type] || '#6C757D';
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: any = {
      COMPRA: 'Compra',
      VENTA: 'Venta',
      USO_TRATAMIENTO: 'Uso en Tratamiento',
      AJUSTE: 'Ajuste Manual',
      VENCIMIENTO: 'Vencimiento',
      DEVOLUCION: 'Devolución'
    };
    return labels[type] || type;
  };

  const MovementCard = ({ item }: { item: StockMovement }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View style={styles.movementIcon}>
          <Ionicons
            name={getMovementIcon(item.type) as any}
            size={24}
            color={getMovementColor(item.type)}
          />
        </View>
        <View style={styles.movementInfo}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <Text style={styles.productSku}>SKU: {item.product.sku}</Text>
        </View>
        <View style={styles.movementAmount}>
          <Text style={[
            styles.quantity,
            { color: item.quantity > 0 ? '#28A745' : '#FF6B6B' }
          ]}>
            {item.quantity > 0 ? '+' : ''}{item.quantity} {item.product.unit}
          </Text>
        </View>
      </View>

      <View style={styles.movementDetails}>
        <View style={[
          styles.typeChip,
          { backgroundColor: getMovementColor(item.type) }
        ]}>
          <Text style={styles.typeText}>
            {getMovementTypeLabel(item.type)}
          </Text>
        </View>
        
        <Text style={styles.movementDate}>
          {new Date(item.createdAt).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {item.reason && (
        <Text style={styles.movementReason}>{item.reason}</Text>
      )}

      <View style={styles.movementFooter}>
        <Text style={styles.movementUser}>
          Por: {item.user.firstName} {item.user.lastName}
        </Text>
        {item.reference && (
          <Text style={styles.movementReference}>
            Ref: {item.reference}
          </Text>
        )}
      </View>
    </View>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          {/* Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Tipo de Movimiento</Text>
            <View style={styles.typeGrid}>
              {[
                { key: '', label: 'Todos' },
                { key: 'COMPRA', label: 'Compras' },
                { key: 'VENTA', label: 'Ventas' },
                { key: 'USO_TRATAMIENTO', label: 'Tratamientos' },
                { key: 'AJUSTE', label: 'Ajustes' },
                { key: 'VENCIMIENTO', label: 'Vencimientos' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeChipFilter,
                    filters.type === type.key && styles.typeChipSelected
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, type: type.key }))}
                >
                  <Text style={[
                    styles.typeTextFilter,
                    filters.type === type.key && styles.typeTextSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Rango de Fechas</Text>
            
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker('from')}
              >
                <Text style={styles.dateButtonText}>
                  Desde: {filters.dateFrom ? filters.dateFrom.toLocaleDateString() : 'Seleccionar'}
                </Text>
                <Ionicons name="calendar" size={16} color="#6C757D" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker('to')}
              >
                <Text style={styles.dateButtonText}>
                  Hasta: {filters.dateTo ? filters.dateTo.toLocaleDateString() : 'Seleccionar'}
                </Text>
                <Ionicons name="calendar" size={16} color="#6C757D" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'from' 
              ? (filters.dateFrom || new Date()) 
              : (filters.dateTo || new Date())
          }
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate) {
              setFilters(prev => ({
                ...prev,
                [showDatePicker === 'from' ? 'dateFrom' : 'dateTo']: selectedDate
              }));
            }
          }}
        />
      )}
    </Modal>
  );

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movimientos de Stock</Text>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={hasActiveFilters ? 'white' : '#4ECDC4'} 
          />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>
            Filtros activos: 
            {filters.type && ` ${getMovementTypeLabel(filters.type)}`}
            {filters.dateFrom && ` desde ${filters.dateFrom.toLocaleDateString()}`}
            {filters.dateTo && ` hasta ${filters.dateTo.toLocaleDateString()}`}
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Ionicons name="close-circle" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Movements List */}
      <FlatList
        data={movements}
        keyExtractor={(item) => item.id}
        renderItem={MovementCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="swap-horizontal" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No hay movimientos</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilters 
                  ? 'No se encontraron movimientos con los filtros aplicados'
                  : 'Aún no hay movimientos de stock registrados'
                }
              </Text>
            </View>
          ) : null
        }
      />

      <FilterModal />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  filterButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4'
  },
  filterButtonActive: {
    backgroundColor: '#4ECDC4'
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B'
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E3F2FD'
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2'
  },
  listContainer: {
    padding: 20
  },
  movementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  movementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  movementIcon: {
    marginRight: 12
  },
  movementInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2
  },
  productSku: {
    fontSize: 12,
    color: '#6C757D'
  },
  movementAmount: {
    alignItems: 'flex-end'
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  movementDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  movementDate: {
    fontSize: 12,
    color: '#6C757D'
  },
  movementReason: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 8,
    fontStyle: 'italic'
  },
  movementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  movementUser: {
    fontSize: 12,
    color: '#6C757D'
  },
  movementReference: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 5
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    paddingHorizontal: 40
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  filterSection: {
    marginBottom: 25
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeChipFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  typeChipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4'
  },
  typeTextFilter: {
    fontSize: 14,
    color: '#6C757D'
  },
  typeTextSelected: {
    color: '#FFFFFF'
  },
  dateRow: {
    gap: 10
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  dateButtonText: {
    fontSize: 14,
    color: '#2C3E50'
  },
  filterActions: {
    flexDirection: 'row',
    gap: 15
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center'
  },
  clearButtonText: {
    fontSize: 16,
    color: '#6C757D'
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
