import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InventoryService, { Product } from '../../services/inventoryService';

export default function ProductForm({ route, navigation }: any) {
  const existingProduct = route.params?.product;
  const isEditing = Boolean(existingProduct);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    costPrice: '',
    salePrice: '',
    minStock: '5',
    unit: 'unidad',
    hasExpiration: false
  });
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
    
    if (existingProduct) {
      setFormData({
        name: existingProduct.name || '',
        description: existingProduct.description || '',
        sku: existingProduct.sku || '',
        barcode: existingProduct.barcode || '',
        category: existingProduct.category || '',
        brand: existingProduct.brand || '',
        costPrice: existingProduct.costPrice?.toString() || '',
        salePrice: existingProduct.salePrice?.toString() || '',
        minStock: existingProduct.minStock?.toString() || '5',
        unit: existingProduct.unit || 'unidad',
        hasExpiration: existingProduct.hasExpiration || false
      });
    }
  }, [existingProduct]);

  const loadCategories = async () => {
    try {
      const response = await InventoryService.getCategories();
      setCategories(response.data.map((cat: any) => cat.name));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async () => {
    // Validations
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre del producto es requerido');
      return;
    }
    
    if (!formData.sku.trim()) {
      Alert.alert('Error', 'El SKU es requerido');
      return;
    }
    
    if (!formData.category.trim()) {
      Alert.alert('Error', 'La categoría es requerida');
      return;
    }
    
    if (!formData.costPrice || isNaN(parseFloat(formData.costPrice))) {
      Alert.alert('Error', 'El precio de costo debe ser un número válido');
      return;
    }
    
    if (!formData.salePrice || isNaN(parseFloat(formData.salePrice))) {
      Alert.alert('Error', 'El precio de venta debe ser un número válido');
      return;
    }
    
    if (!formData.minStock || isNaN(parseInt(formData.minStock))) {
      Alert.alert('Error', 'El stock mínimo debe ser un número válido');
      return;
    }

    setLoading(true);
    
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim().toUpperCase(),
        barcode: formData.barcode.trim() || undefined,
        category: formData.category.trim(),
        brand: formData.brand.trim() || undefined,
        costPrice: parseFloat(formData.costPrice),
        salePrice: parseFloat(formData.salePrice),
        minStock: parseInt(formData.minStock),
        unit: formData.unit.trim(),
        hasExpiration: formData.hasExpiration
      };

      if (isEditing) {
        await InventoryService.updateProduct(existingProduct.id, productData);
        Alert.alert(
          'Éxito',
          'Producto actualizado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        await InventoryService.createProduct(productData);
        Alert.alert(
          'Éxito',
          'Producto creado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo guardar el producto'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const CategorySelector = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.label}>Categoría *</Text>
      <View style={styles.categoryGrid}>
        {['Fillers', 'Toxina Botulínica', 'Peelings', 'Mesoterapia', 'Dispositivos', 'Consumibles'].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              formData.category === cat && styles.categoryChipSelected
            ]}
            onPress={() => handleInputChange('category', cat)}
          >
            <Text style={[
              styles.categoryText,
              formData.category === cat && styles.categoryTextSelected
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Campo personalizado */}
      <TextInput
        style={styles.input}
        placeholder="O escribir categoría personalizada"
        value={formData.category}
        onChangeText={(value) => handleInputChange('category', value)}
      />
    </View>
  );

  const UnitSelector = () => (
    <View style={styles.unitContainer}>
      <Text style={styles.label}>Unidad de Medida *</Text>
      <View style={styles.unitGrid}>
        {['unidad', 'ml', 'gr', 'kg', 'lt', 'caja'].map((unit) => (
          <TouchableOpacity
            key={unit}
            style={[
              styles.unitChip,
              formData.unit === unit && styles.unitChipSelected
            ]}
            onPress={() => handleInputChange('unit', unit)}
          >
            <Text style={[
              styles.unitText,
              formData.unit === unit && styles.unitTextSelected
            ]}>
              {unit}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Text style={styles.saveButton}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock Mínimo *</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              value={formData.minStock}
              onChangeText={(value) => handleInputChange('minStock', value)}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              Se enviará alerta cuando el stock sea menor a este valor
            </Text>
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchInfo}>
              <Text style={styles.label}>Producto con Vencimiento</Text>
              <Text style={styles.helpText}>
                ¿Este producto tiene fecha de vencimiento?
              </Text>
            </View>
            <Switch
              value={formData.hasExpiration}
              onValueChange={(value) => handleInputChange('hasExpiration', value)}
              trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
              thumbColor={formData.hasExpiration ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Form Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Producto')}
            </Text>
          </TouchableOpacity>
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
    color: '#2C3E50'
  },
  saveButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4'
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FFFFFF'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  helpText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 5
  },
  categoryContainer: {
    marginBottom: 20
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  categoryChipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4'
  },
  categoryText: {
    fontSize: 14,
    color: '#6C757D'
  },
  categoryTextSelected: {
    color: '#FFFFFF'
  },
  unitContainer: {
    marginBottom: 20
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  unitChipSelected: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4'
  },
  unitText: {
    fontSize: 12,
    color: '#6C757D'
  },
  unitTextSelected: {
    color: '#FFFFFF'
  },
  priceRow: {
    flexDirection: 'row',
    gap: 15
  },
  priceInput: {
    flex: 1
  },
  marginInfo: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  marginText: {
    fontSize: 14,
    color: '#28A745',
    fontWeight: '500',
    textAlign: 'center'
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10
  },
  switchInfo: {
    flex: 1,
    marginRight: 15
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 15
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
            <Text style={styles.label}>Nombre del Producto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Ácido Hialurónico 1ml"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción detallada del producto..."
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>

          <CategorySelector />
        </View>

        {/* Identification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificación</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU (Código Único) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: AH001"
              value={formData.sku}
              onChangeText={(value) => handleInputChange('sku', value.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de Barras</Text>
            <TextInput
              style={styles.input}
              placeholder="Código EAN/UPC (opcional)"
              value={formData.barcode}
              onChangeText={(value) => handleInputChange('barcode', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Restylane, Juvederm..."
              value={formData.brand}
              onChangeText={(value) => handleInputChange('brand', value)}
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precios</Text>
          
          <View style={styles.priceRow}>
            <View style={styles.priceInput}>
              <Text style={styles.label}>Precio Costo *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.costPrice}
                onChangeText={(value) => handleInputChange('costPrice', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.priceInput}>
              <Text style={styles.label}>Precio Venta *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.salePrice}
                onChangeText={(value) => handleInputChange('salePrice', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Profit Margin Display */}
          {formData.costPrice && formData.salePrice && (
            <View style={styles.marginInfo}>
              <Text style={styles.marginText}>
                Margen: {(((parseFloat(formData.salePrice) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Control de Stock</Text>
          
          <UnitSelector />

          <View style={styles.inputGroup}>
