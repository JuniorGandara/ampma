import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import InventoryService, { Product, Supplier } from '../../services/inventoryService';

interface PurchaseItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
  expiryDate?: Date;
}

export default function PurchaseForm({ route, navigation }: any) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario para agregar producto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  useEffect(() => {
    loadInitialData();
    
    // Si viene de alertas con producto preseleccionado
    if (route.params?.preselectedProduct) {
      const product = route.params.preselectedProduct;
      setSelectedProduct(product);
      setQuantity('10'); // Cantidad sugerida
      setUnitPrice(product.costPrice?.toString() || '');
    }
  }, []);

  const loadInitialData = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        InventoryService.getSuppliers({ limit: 100 }),
        InventoryService.getProducts({ limit: 200 })
      ]);
      
      setSuppliers(suppliersRes.data.suppliers);
      setProducts(productsRes.data.products);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
  };

  const addItem = () => {
    if (!selectedProduct || !quantity || !unitPrice) {
      Alert.alert('Error', 'Complete todos los campos del producto');
      return;
    }

    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      quantity: parseInt(quantity),
      unitPrice: parseFloat(unitPrice),
      total: parseInt(quantity) * parseFloat(unitPrice),
      expiryDate: expiryDate || undefined
    };

    setItems([...items, newItem]);
    
    // Limpiar formulario
    setSelectedProduct(null);
    setQuantity('');
    setUnitPrice('');
    setExpiryDate(null);
    setShowProductModal(false);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.21; // IVA 21%
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      Alert.alert('Error', 'Seleccione un proveedor');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Agregue al menos un producto');
      return;
    }

    setLoading(true);
    try {
      const purchaseData = {
        supplierId: selectedSupplier.id,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: item.expiryDate?.toISOString()
        })),
        dueDate: dueDate?.toISOString()
      };

      await InventoryService.createPurchase(purchaseData);
      
      Alert.alert(
        'Éxito',
        'Orden de compra creada correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la orden de compra');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nueva Orden de Compra</Text>
        </View>

        {/* Supplier Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proveedor</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowSupplierModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {selectedSupplier ? selectedSupplier.name : 'Seleccionar proveedor'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6C757D" />
          </TouchableOpacity>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fecha de vencimiento (opcional)</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.selectButtonText}>
              {dueDate ? dueDate.toLocaleDateString() : 'Seleccionar fecha'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6C757D" />
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos ({items.length})</Text>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setShowProductModal(true)}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemDetails}>
                {item.quantity} {item.product.unit} × ${item.unitPrice} = ${item.total}
              </Text>
              {item.expiryDate && (
                <Text style={styles.itemExpiry}>
                  Vence: {item.expiryDate.toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Totals */}
        {items.length > 0 && (
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA (21%):</Text>
              <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalLabelFinal}>Total:</Text>
              <Text style={styles.totalValueFinal}>${total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creando...' : 'Crear Orden de Compra'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Supplier Modal */}
      <Modal visible={showSupplierModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Proveedor</Text>
            <TouchableOpacity onPress={() => setShowSupplierModal(false)}>
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedSupplier(item);
                  setShowSupplierModal(false);
                }}
              >
                <Text style={styles.modalItemName}>{item.name}</Text>
                <Text style={styles.modalItemDetails}>{item.cuit}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Producto</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.productForm}>
            {/* Product Selection */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {/* TODO: Implement product selection */}}
            >
              <Text style={styles.selectButtonText}>
                {selectedProduct ? selectedProduct.name : 'Seleccionar producto'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6C757D" />
            </TouchableOpacity>

            {/* Quantity */}
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            {/* Unit Price */}
            <TextInput
              style={styles.input}
              placeholder="Precio unitario"
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="numeric"
            />

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>Agregar Producto</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDueDate(selectedDate);
            }
          }}
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10
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
    color: '#2C3E50',
    marginBottom: 15
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#F8F9FA'
  },
  selectButtonText: {
    fontSize: 16,
    color: '#2C3E50'
  },
  addItemButton: {
    backgroundColor: '#4ECDC4',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50'
  },
  itemDetails: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 3
  },
  itemExpiry: {
    fontSize: 12,
    color: '#FF6B6B'
  },
  totalsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 5
  },
  totalLabel: {
    fontSize: 16,
    color: '#6C757D'
  },
  totalValue: {
    fontSize: 16,
    color: '#2C3E50'
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745'
  },
  submitButton: {
    backgroundColor: '#4ECDC4',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  modalItem: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 5
  },
  modalItemDetails: {
    fontSize: 14,
    color: '#6C757D'
  },
  productForm: {
    padding: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    backgroundColor: 'white',
    fontSize: 16
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
