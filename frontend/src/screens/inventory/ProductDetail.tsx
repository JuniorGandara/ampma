import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InventoryService, { Product } from '../../services/inventoryService';
import StockBadge from '../../components/inventory/StockBadge';

export default function ProductDetail({ route, navigation }: any) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const response = await InventoryService.getProductById(productId);
      setProduct(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el producto');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProduct();
  };

  const handleAdjustStock = async () => {
    if (!adjustQuantity || isNaN(parseInt(adjustQuantity))) {
      Alert.alert('Error', 'Ingrese una cantidad válida');
      return;
    }

    try {
      await InventoryService.adjustStock(productId, {
        quantity: parseInt(adjustQuantity),
        reason: adjustReason || 'Ajuste manual'
      });

      Alert.alert('Éxito', 'Stock ajustado correctamente');
      setShowAdjustModal(false);
      setAdjustQuantity('');
      setAdjustReason('');
      loadProduct();
    } catch (error) {
      Alert.alert('Error', 'No se pudo ajustar el stock');
    }
  };

  const InfoCard = ({ title, value, icon }: any) => (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Ionicons name={icon} size={20} color="#4ECDC4" />
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const MovementItem = ({ movement }: any) => (
    <View style={styles.movementItem}>
      <View style={styles.movementHeader}>
        <View style={[
          styles.movementType,
          { backgroundColor: getMovementColor(movement.type) }
        ]}>
          <Text style={styles.movementTypeText}>
            {getMovementTypeLabel(movement.type)}
          </Text>
        </View>
        <Text style={styles.movementDate}>
          {new Date(movement.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.movementQuantity}>
        {movement.quantity > 0 ? '+' : ''}{movement.quantity} {product?.unit}
      </Text>
      {movement.reason && (
        <Text style={styles.movementReason}>{movement.reason}</Text>
      )}
      <Text style={styles.movementUser}>
        Por: {movement.user.firstName} {movement.user.lastName}
      </Text>
    </View>
  );

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
      USO_TRATAMIENTO: 'Uso',
      AJUSTE: 'Ajuste',
      VENCIMIENTO: 'Vencido',
      DEVOLUCION: 'Devolución'
    };
    return labels[type] || type;
  };

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Cargando producto...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product.name}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductForm', { product })}>
          <Ionicons name="create" size={24} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Info */}
        <View style={styles.section}>
          <View style={styles.productHeader}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSku}>SKU: {product.sku}</Text>
              {product.barcode && (
                <Text style={styles.productBarcode}>Código: {product.barcode}</Text>
              )}
              <Text style={styles.productCategory}>{product.category}</Text>
              {product.brand && (
                <Text style={styles.productBrand}>Marca: {product.brand}</Text>
              )}
            </View>
            <StockBadge
              currentStock={product.currentStock}
              minStock={product.minStock}
              unit={product.unit}
              size="large"
            />
          </View>

          {product.description && (
            <Text style={styles.productDescription}>{product.description}</Text>
          )}
        </View>

        {/* Stock Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Stock</Text>
          <View style={styles.infoGrid}>
            <InfoCard
              title="Stock Actual"
              value={`${product.currentStock} ${product.unit}`}
              icon="cube"
            />
            <InfoCard
              title="Stock Mínimo"
              value={`${product.minStock} ${product.unit}`}
              icon="warning"
            />
          </View>
        </View>

        {/* Price Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precios</Text>
          <View style={styles.infoGrid}>
            <InfoCard
              title="Precio Costo"
              value={`$${product.costPrice}`}
              icon="pricetag"
            />
            <InfoCard
              title="Precio Venta"
              value={`$${product.salePrice}`}
              icon="cash"
            />
          </View>
        </View>

        {/* Suppliers */}
        {product.suppliers && product.suppliers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proveedores</Text>
            {product.suppliers.map((ps: any) => (
              <View key={ps.id} style={styles.supplierItem}>
                <Text style={styles.supplierName}>{ps.supplier.name}</Text>
                <Text style={styles.supplierPrice}>
                  ${ps.supplierPrice} {ps.isPreferred && '⭐'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stock Movements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movimientos Recientes</Text>
          {product.stockMovements && product.stockMovements.length > 0 ? (
            product.stockMovements.slice(0, 10).map((movement: any) => (
              <MovementItem key={movement.id} movement={movement} />
            ))
          ) : (
            <Text style={styles.emptyText}>No hay movimientos registrados</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => setShowAdjustModal(true)}
          >
            <Ionicons name="settings" size={20} color="white" />
            <Text style={styles.buttonText}>Ajustar Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => navigation.navigate('PurchaseForm', { preselectedProduct: product })}
          >
            <Ionicons name="cart" size={20} color="white" />
            <Text style={styles.buttonText}>Ordenar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Adjust Stock Modal */}
      <Modal
        visible={showAdjustModal}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustar Stock</Text>
              <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
                <Ionicons name="close" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Stock actual: {product.currentStock} {product.unit}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Cantidad a ajustar (+/-)"
              value={adjustQuantity}
              onChangeText={setAdjustQuantity}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Motivo del ajuste (opcional)"
              value={adjustReason}
              onChangeText={setAdjustReason}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleAdjustStock}
            >
              <Text style={styles.confirmButtonText}>Confirmar Ajuste</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 20
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  productInfo: {
    flex: 1,
    marginRight: 15
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5
  },
  productSku: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 3
  },
  productBarcode: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 3
  },
  productCategory: {
    fontSize: 16,
    color: '#4ECDC4',
    fontWeight: '500',
    marginBottom: 3
  },
  productBrand: {
    fontSize: 14,
    color: '#6C757D'
  },
  productDescription: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 15
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  infoTitle: {
    fontSize: 14,
    color: '#6C757D',
    marginLeft: 8
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  supplierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  supplierName: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500'
  },
  supplierPrice: {
    fontSize: 16,
    color: '#28A745',
    fontWeight: 'bold'
  },
  movementItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  movementType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  movementTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  movementDate: {
    fontSize: 12,
    color: '#6C757D'
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5
  },
  movementReason: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 3
  },
  movementUser: {
    fontSize: 12,
    color: '#6C757D'
  },
  emptyText: {
    textAlign: 'center',
    color: '#6C757D',
    fontStyle: 'italic',
    paddingVertical: 20
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15
  },
  adjustButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8
  },
  orderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9C27B0',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
