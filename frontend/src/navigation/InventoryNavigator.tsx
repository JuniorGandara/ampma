import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import InventoryDashboard from '../screens/inventory/InventoryDashboard';
import ProductList from '../screens/inventory/ProductList';
import ProductDetail from '../screens/inventory/ProductDetail';
import ProductForm from '../screens/inventory/ProductForm';
import StockAlerts from '../screens/inventory/StockAlerts';
import StockMovements from '../screens/inventory/StockMovements';
import StockAdjustment from '../screens/inventory/StockAdjustment';
import SupplierList from '../screens/inventory/SupplierList';
import SupplierDetail from '../screens/inventory/SupplierDetail';
import SupplierForm from '../screens/inventory/SupplierForm';
import PurchaseList from '../screens/inventory/PurchaseList';
import PurchaseDetail from '../screens/inventory/PurchaseDetail';
import PurchaseForm from '../screens/inventory/PurchaseForm';
import ReceivePurchase from '../screens/inventory/ReceivePurchase';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack Navigators para cada sección
function ProductsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProductList" 
        component={ProductList}
        options={{ title: 'Productos' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetail}
        options={{ title: 'Detalle del Producto' }}
      />
      <Stack.Screen 
        name="ProductForm" 
        component={ProductForm}
        options={{ title: 'Nuevo Producto' }}
      />
      <Stack.Screen 
        name="StockAdjustment" 
        component={StockAdjustment}
        options={{ title: 'Ajustar Stock' }}
      />
    </Stack.Navigator>
  );
}

function SuppliersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SupplierList" 
        component={SupplierList}
        options={{ title: 'Proveedores' }}
      />
      <Stack.Screen 
        name="SupplierDetail" 
        component={SupplierDetail}
        options={{ title: 'Detalle del Proveedor' }}
      />
      <Stack.Screen 
        name="SupplierForm" 
        component={SupplierForm}
        options={{ title: 'Nuevo Proveedor' }}
      />
    </Stack.Navigator>
  );
}

function PurchasesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="PurchaseList" 
        component={PurchaseList}
        options={{ title: 'Órdenes de Compra' }}
      />
      <Stack.Screen 
        name="PurchaseDetail" 
        component={PurchaseDetail}
        options={{ title: 'Detalle de Compra' }}
      />
      <Stack.Screen 
        name="PurchaseForm" 
        component={PurchaseForm}
        options={{ title: 'Nueva Orden de Compra' }}
      />
      <Stack.Screen 
        name="ReceivePurchase" 
        component={ReceivePurchase}
        options={{ title: 'Recibir Mercadería' }}
      />
    </Stack.Navigator>
  );
}

function StockStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="StockMovements" 
        component={StockMovements}
        options={{ title: 'Movimientos de Stock' }}
      />
      <Stack.Screen 
        name="StockAlerts" 
        component={StockAlerts}
        options={{ title: 'Alertas de Stock' }}
      />
    </Stack.Navigator>
  );
}

// Tab Navigator principal del inventario
function InventoryTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Suppliers':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Purchases':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Stock':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#6C757D',
        headerShown: false
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={InventoryDashboard}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsStack}
        options={{ tabBarLabel: 'Productos' }}
      />
      <Tab.Screen 
        name="Suppliers" 
        component={SuppliersStack}
        options={{ tabBarLabel: 'Proveedores' }}
      />
      <Tab.Screen 
        name="Purchases" 
        component={PurchasesStack}
        options={{ tabBarLabel: 'Compras' }}
      />
      <Tab.Screen 
        name="Stock" 
        component={StockStack}
        options={{ tabBarLabel: 'Stock' }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator principal
export default function InventoryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryTabs" component={InventoryTabs} />
      
      {/* Pantallas modales que se abren desde cualquier tab */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen 
          name="ProductForm" 
          component={ProductForm}
          options={{ title: 'Nuevo Producto' }}
        />
        <Stack.Screen 
          name="SupplierForm"
