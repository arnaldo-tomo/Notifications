import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [posts, setPosts] = useState([]);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [tamanhoDosDados, setTamanhoDosDados] = useState(0);
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };


  }, []);




  useEffect(() =>   {
     const interval = setInterval(async() =>   {
      const tamanhoDoUltimoDado = await AsyncStorage.getItem('data');
      console.log("Fui buscar e Encontrei ",tamanhoDoUltimoDado);
      const estadoDaRede = await Network.getNetworkStateAsync()

      if (estadoDaRede.isConnected) {
        try {
          const resposta = await fetch('http://192.168.125.202:2024/api/cidades');
          const novosDados = await resposta.json();
            const tamanhoDoUltimoDado = await AsyncStorage.getItem('data');

          if (parseInt(novosDados.Cidades.length) > parseInt(tamanhoDoUltimoDado)) {
            await AsyncStorage.setItem('data', novosDados.Cidades.length.toString());
            setTamanhoDosDados(novosDados.Cidades.length); // Atualiza o estado para comparação
            console.log('Novas postagens:', novosDados.Cidades.length);
            const ultimoDado = novosDados.Cidades[novosDados.Cidades.length - 1];

            console.log(ultimoDado);
            schedulePushNotification(ultimoDado); // Agenda notificação por push

          }
        } catch (erro) {
          console.error('Erro ao buscar dados:', erro);
      }
    }
    }, 5000); 

    return () => clearInterval(interval);
  }, []);


  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}>
  
      <Button
        title="Press to schedule a notification"
        onPress={async () => {
          await schedulePushNotification();
        }}
      />

    </View>
  );
}

async function schedulePushNotification(ultimoDado) {

  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "INGD - AVISO 📬",
      body: ultimoDado.created_at,
      data: { data: 'goes here' },
    },
    trigger: { seconds: 1 },
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' })).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}
