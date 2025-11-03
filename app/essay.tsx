import React from 'react';
import { StyleSheet, View, Pressable, Alert, ScrollView, Image } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import { analyzeEssay } from '@/lib/ai';
import { useEssayRepository } from '@/lib/repositories';

export default function EssayScreen() {
  const [essayText, setEssayText] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);
  const { saveEssay } = useEssayRepository();

  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleAnalyzeEssay = async () => {
    if (!essayText.trim() && !selectedImage) {
      Alert.alert('Erro', 'Por favor, escreva uma redação ou envie uma foto da redação.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeEssay(essayText, selectedImage);
      setAnalysisResult(result);

      // Extrair nota da análise (buscar padrão "NOTA: X/10" ou "nota de X")
      const scoreMatch = result.match(/(?:NOTA:|nota de?)\s*(\d+(?:\.\d+)?)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

      // Extrair título da redação se houver
      const titleMatch = result.match(/Título:\s*(.+?)(?:\n|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : (essayText ? essayText.substring(0, 50) + '...' : 'Redação');

      // Salvar no banco de dados
      await saveEssay(title, essayText || null, selectedImage, result, score);
      
      Alert.alert('Sucesso!', 'Análise concluída e salva com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao analisar a redação. Verifique sua conexão e tente novamente.');
      console.error('Erro na análise:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setEssayText('');
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>Redação</ThemedText>
          <ThemedText style={styles.subtitle}>
            Escreva sua redação ou envie uma foto para análise da IA
          </ThemedText>

          {/* Área de texto da redação */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Escrever Redação
            </ThemedText>
            <ThemedTextInput
              value={essayText}
              onChangeText={setEssayText}
              placeholder="Digite sua redação aqui..."
              multiline
              numberOfLines={8}
              style={[styles.textArea, { borderColor: border }]}
              textAlignVertical="top"
            />
          </View>

          {/* Área de upload de imagem */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Ou Envie uma Foto
            </ThemedText>
            <Pressable
              style={[styles.imagePicker, { borderColor: border }]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera" size={32} color={tint} />
                  <ThemedText style={styles.uploadText}>Toque para selecionar uma foto</ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          {/* Botões de ação */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.analyzeButton, { backgroundColor: tint }]}
              onPress={handleAnalyzeEssay}
              disabled={isAnalyzing}
            >
              <Ionicons 
                name={isAnalyzing ? "hourglass" : "analytics"} 
                size={20} 
                color="#fff" 
              />
              <ThemedText style={styles.buttonText}>
                {isAnalyzing ? 'Analisando...' : 'Analisar Redação'}
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.clearButton, { borderColor: border }]}
              onPress={clearAll}
            >
              <Ionicons name="trash" size={20} color={tint} />
              <ThemedText style={[styles.buttonText, { color: tint }]}>
                Limpar Tudo
              </ThemedText>
            </Pressable>
          </View>

          {/* Resultado da análise */}
          {analysisResult && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Análise da Redação
              </ThemedText>
              <ScrollView 
                style={styles.analysisContainer}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <ThemedText style={styles.analysisText}>{analysisResult}</ThemedText>
              </ScrollView>
            </View>
          )}
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
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 8,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  textArea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  analysisContainer: {
    maxHeight: 500,
    minHeight: 200,
  },
  analysisText: {
    lineHeight: 22,
    fontSize: 15,
    padding: 8,
  },
});
