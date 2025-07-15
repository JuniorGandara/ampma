import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main Screens
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';

// Patient Screens
import PatientsScreen from './src/screens/PatientsScreen';
import PatientDetailsScreen from './src/screens/PatientDetailsScreen';
import PatientFormScreen from './src/screens/PatientFormScreen';

// Other Screens (to be implemented in future chats)
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import TreatmentsScreen from './src/screens/TreatmentsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SuppliersScreen from './src/screens/SuppliersScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Loading Screen
import LoadingScreen from './src/screens/LoadingScreen';

// Types
export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
 
  // Main
  Home: undefined;
  Dashboard: undefined;
 
  // Patients
  Patients: undefined;
  PatientDetails: { patientId: string };
  CreatePatient: undefined;
  EditPatient: { patientId: string; patient?: any };
 
  // Appointments
  Appointments: undefined;
  CreateAppointment: { patientId?: string };
  EditAppointment: { appointmentId: string };
 
  // Treatments
  Treatments: undefined;
  TreatmentDetails: { treatmentId: string };
 
  // Inventory
  Inventory: undefined;
  ProductDetails: { productId: string };
 
  // Suppliers
  Suppliers: undefined;
  SupplierDetails: { supplierId: string };
 
  // Invoices
  Invoices: undefined;
  InvoiceDetails: { invoiceId: string };
  CreateInvoice: { patientId?: string };
 
  // Reports
  Reports: undefined;
 
  // Profile & Settings
  Profile: undefined;
  Settings: undefined;
 
  // Loading
  Loading: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Global variables for auth token
declare global {
  var authToken: string | null;
  var userRole: 'ADMIN' | 'MEDICO' | 'SECRETARIA' | 'VIEWER' | null;
  var userId: string | null;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
	checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
	try {
  	// Check if user is logged in
  	const token = await AsyncStorage.getItem('authToken');
  	const userRole = await AsyncStorage.getItem('userRole');
  	const userId = await AsyncStorage.getItem('userId');
 	 
  	if (token && userRole && userId) {
    	// Set global variables
    	global.authToken = token;
    	global.userRole = userRole as any;
    	global.userId = userId;
   	 
    	// Verify token is still valid (optional)
    	const response = await fetch(`${process.env.API_BASE_URL}/auth/verify`, {
      	headers: {
        	'Authorization': `Bearer ${token}`,
        	'Content-Type': 'application/json'
      	}
    	});
   	 
    	if (response.ok) {
      	setIsAuthenticated(true);
    	} else {
      	// Token is invalid, clear storage
      	await AsyncStorage.multiRemove(['authToken', 'userRole', 'userId']);
      	global.authToken = null;
      	global.userRole = null;
      	global.userId = null;
    	}
  	}
	} catch (error) {
  	console.error('Error checking auth status:', error);
	} finally {
  	setIsLoading(false);
	}
  };

  if (isLoading) {
	return <LoadingScreen />;
  }

  return (
	<Provider store={store}>
  	<NavigationContainer>
    	<StatusBar style="auto" />
    	<Stack.Navigator
      	initialRouteName={isAuthenticated ? "Dashboard" : "Login"}
      	screenOptions={{
        	headerStyle: {
          	backgroundColor: '#2c5aa0',
        	},
        	headerTintColor: '#ffffff',
        	headerTitleStyle: {
          	fontWeight: 'bold',
        	},
      	}}
    	>
      	{/* Auth Screens */}
      	{!isAuthenticated ? (
        	<>
          	<Stack.Screen
            	name="Login"
            	component={LoginScreen}
            	options={{
              	headerShown: false,
              	title: 'Iniciar Sesión'
            	}}
          	/>
          	<Stack.Screen
            	name="Register"
            	component={RegisterScreen}
            	options={{
              	title: 'Registrarse',
              	headerBackTitleVisible: false
            	}}
          	/>
        	</>
      	) : (
        	<>
          	{/* Main App Screens */}
          	<Stack.Screen
            	name="Dashboard"
            	component={DashboardScreen}
            	options={{
              	title: 'Centro de Medicina Estética',
              	headerLeft: () => null, // Remove back button
            	}}
          	/>
         	 
          	<Stack.Screen
            	name="Home"
            	component={HomeScreen}
            	options={{ title: 'Inicio' }}
          	/>

          	{/* Patient Management */}
          	<Stack.Screen
            	name="Patients"
            	component={PatientsScreen}
            	options={{ title: 'Pacientes' }}
          	/>
         	 
          	<Stack.Screen
            	name="PatientDetails"
            	component={PatientDetailsScreen}
            	options={{
              	title: 'Detalles del Paciente',
              	headerBackTitleVisible: false
            	}}
          	/>
         	 
          	<Stack.Screen
            	name="CreatePatient"
            	component={PatientFormScreen}
            	options={{
              	title: 'Nuevo Paciente',
              	presentation: 'modal',
              	headerBackTitleVisible: false
            	}}
          	/>
         	 
          	<Stack.Screen
            	name="EditPatient"
            	component={PatientFormScreen}
            	options={{
              	title: 'Editar Paciente',
              	presentation: 'modal',
              	headerBackTitleVisible: false
            	}}
          	/>

          	{/* Appointments */}
          	<Stack.Screen
            	name="Appointments"
            	component={AppointmentsScreen}
            	options={{ title: 'Agenda' }}
          	/>
         	 
          	<Stack.Screen
            	name="CreateAppointment"
            	component={AppointmentsScreen} // Placeholder
            	options={{
              	title: 'Nueva Cita',
              	presentation: 'modal'
            	}}
          	/>

          	{/* Treatments */}
          	<Stack.Screen
            	name="Treatments"
            	component={TreatmentsScreen}
            	options={{ title: 'Tratamientos' }}
          	/>
         	 
          	<Stack.Screen
            	name="TreatmentDetails"
            	component={TreatmentsScreen} // Placeholder
            	options={{ title: 'Detalles del Tratamiento' }}
          	/>

          	{/* Inventory */}
          	<Stack.Screen
            	name="Inventory"
            	component={InventoryScreen}
            	options={{ title: 'Inventario' }}
          	/>
         	 
          	<Stack.Screen
            	name="ProductDetails"
            	component={InventoryScreen} // Placeholder
            	options={{ title: 'Detalles del Producto' }}
          	/>

          	{/* Suppliers */}
          	<Stack.Screen
            	name="Suppliers"
            	component={SuppliersScreen}
            	options={{ title: 'Proveedores' }}
          	/>
         	 
          	<Stack.Screen
            	name="SupplierDetails"
            	component={SuppliersScreen} // Placeholder
            	options={{ title: 'Detalles del Proveedor' }}
          	/>

          	{/* Invoices */}
          	<Stack.Screen
            	name="Invoices"
            	component={InvoicesScreen}
            	options={{ title: 'Facturación' }}
          	/>
         	 
          	<Stack.Screen
            	name="InvoiceDetails"
            	component={InvoicesScreen} // Placeholder
            	options={{ title: 'Detalles de Factura' }}
          	/>
         	 
          	<Stack.Screen
            	name="CreateInvoice"
            	component={InvoicesScreen} // Placeholder
            	options={{
              	title: 'Nueva Factura',
              	presentation: 'modal'
            	}}
          	/>

          	{/* Reports */}
          	<Stack.Screen
            	name="Reports"
            	component={ReportsScreen}
            	options={{ title: 'Reportes' }}
          	/>

          	{/* Profile & Settings */}
          	<Stack.Screen
            	name="Profile"
            	component={ProfileScreen}
            	options={{ title: 'Mi Perfil' }}
          	/>
         	 
          	<Stack.Screen
            	name="Settings"
            	component={SettingsScreen}
            	options={{ title: 'Configuración' }}
          	/>
        	</>
      	)}
    	</Stack.Navigator>
  	</NavigationContainer>
	</Provider>
  );
}
