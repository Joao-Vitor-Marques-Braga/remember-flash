import { Link } from 'expo-router';
import { StyleSheet, View, Button, Alert } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApiKey, saveApiKey, deleteApiKey, getModelName, saveModelName } from '@/lib/secure';
import { ThemedTextInput } from '@/components/ThemedTextInput';

export default function ModalScreen() {
  const [value, setValue] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [model, setModel] = React.useState('gemini-1.5-flash-latest');
  React.useEffect(() => {
    (async () => {
      const existing = await getApiKey();
      if (existing) setValue(existing);
      const existingModel = await getModelName();
      if (existingModel) setModel(existingModel);
      setLoaded(true);
    })();
  }, []);

  async function onSave() {
    await saveApiKey(value.trim());
    await saveModelName(model.trim());
    Alert.alert('Sucesso', 'Chave salva com sucesso.');
  }

  async function onClear() {
    await deleteApiKey();
    setValue('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <ThemedText type="title">Configurar IA (Gemini)</ThemedText>
          <ThemedText>Informe sua API key do Gemini.</ThemedText>
          <View style={{ height: 12 }} />
      <ThemedTextInput
            placeholder="GEMINI_API_KEY"
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
      <View style={{ height: 8 }} />
      <ThemedTextInput
        placeholder="Modelo (ex.: gemini-1.5-flash-latest)"
        value={model}
        onChangeText={setModel}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
          <View style={{ height: 12 }} />
          <Button title="Salvar" onPress={onSave} disabled={!loaded} />
          <View style={{ height: 8 }} />
          <Button title="Limpar" onPress={onClear} color="#cc0000" disabled={!loaded} />
          <Link href="/" dismissTo style={styles.link}>
            <ThemedText type="link">Voltar</ThemedText>
          </Link>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  input: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
