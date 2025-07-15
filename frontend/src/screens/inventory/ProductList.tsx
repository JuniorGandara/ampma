import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InventoryService, { Product } from '../../services/inventoryService';

export default function ProductList({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: true
  });

  useEffect(() => {
    loadProducts(true);
    loadCategories();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async (reset = false) => {
    try {
      const page = reset ? 1 : pagination.page;
      
      const response = await InventoryService.getProducts({
        page,
        limit: 20,
        search: searchQuery,
        category: selectedCategory
      });

      const newProducts = response.data.products;
      
      if (reset) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

      setPagination({
        page: page + 1,
        hasMore: page < response.data.pagination.pages
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await InventoryService.getCategories();
      setCategories(response.data.map((cat: any) => cat.name));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts(true);
  };

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      loadProducts();
    }
  };

  const ProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={[
          styles.stockBadge,
          { backgroundColor: getStockColor(item) }
        ]}>
          <Text style={styles.stockText}>{item.currentStock} {item.unit}</Text>
        </View>
      </View>
      
      <Text style={styles.productSku}>SKU: {item.sku}</Text>
      <Text style={styles.productCategory}>{item.category}</Text>
      
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>${item.salePrice}</Text>
        {item.alerts && (
          <View style={styles.alertsContainer}>
            {item.alerts.lowStock && (
              <Ionicons name="warning" size={16} color="#FFB74D" />
            )}
            {item.alerts.noStock && (
              <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStockColor = (product: Product) => {
    if (product.currentStock <= 0) return '#FF6B6B';
    if (product.currentStock <= product.minStock) return '#FFB74D';
    return '#4ECDC4';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6C757D" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('ProductForm')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Todas', ...categories]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { backgroundColor: selectedCategory === (item === 'Todas' ? '' : item) ? '#4ECDC4' : '#E9ECEF' }
              ]}
              onPress={() => setSelectedCategory(item === 'Todas' ? '' : item)}
            >
              <Text style={[
                styles.categoryText,
                { color: selectedCategory === (item === 'Todas' ? '' : item) ? 'white' : '#6C757D' }
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={ProductCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 15
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterContainer: {
    paddingVertical: 15,
    paddingLeft: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500'
  },
  listContainer: {
    padding: 20
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 10
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  stockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  productSku: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 2
  },
  productCategory: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 10
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28A745'
  },
  alertsContainer: {
    flexDirection: 'row',
    gap: 5
  }
});
