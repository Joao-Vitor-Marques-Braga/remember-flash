import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useCategoryRepository, useFolderRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FolderScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const folderId = Number(params.id);
  const navigation = useNavigation();
  const router = useRouter();
  const { listCategories, createCategory, deleteCategory, reorderCategories } = useCategoryRepository();
  const { renameFolder, updateFolderSettings, getFolder } = useFolderRepository();

  const [folderName, setFolderName] = React.useState<string>(String(params.name || ''));
  const [editingName, setEditingName] = React.useState(false);
  const [banca, setBanca] = React.useState<string>('');
  const [questionType, setQuestionType] = React.useState<'MC' | 'TF'>('MC');
  const [newCategory, setNewCategory] = React.useState('');
  const [categories, setCategories] = React.useState<Array<{ id: number; name: string }>>([]);

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const load = React.useCallback(async () => {
    if (!folderId) return;
    const data = await listCategories(folderId);
    setCategories(data);
    const f = await getFolder(folderId);
    if (f) {
      setFolderName(f.name);
      setBanca(f.banca || '');
      setQuestionType((f.question_type as any) === 'TF' ? 'TF' : 'MC');
      navigation.setOptions({ title: f.name });
    }
  }, [folderId, listCategories, getFolder, navigation]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onAddCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    await createCategory(trimmed, folderId);
    setNewCategory('');
    await load();
  }

  async function onDeleteCategory(id: number) {
    await deleteCategory(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <DraggableFlatList
          data={categories}
          keyExtractor={(i) => String(i.id)}
          activationDistance={8}
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              {editingName ? (
                <View style={{ marginBottom: 8 }}>
                  <ThemedText type="subtitle">Renomear pasta</ThemedText>
                  <ThemedTextInput value={folderName} onChangeText={setFolderName} style={styles.input} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={styles.cancelButton} onPress={() => { setFolderName(String(params.name || '')); setEditingName(false); }}>
                      <ThemedText style={{ color: Colors.light.background }}>Cancelar</ThemedText>
                    </Pressable>
                    <Pressable style={styles.saveButton} onPress={async () => { await renameFolder(folderId, folderName.trim()); navigation.setOptions({ title: folderName.trim() }); setEditingName(false); }}>
                      <ThemedText style={{ color: Colors.light.background }}>Salvar</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 }}>
                  <ThemedText type="title">{folderName || 'Pasta'}</ThemedText>
                  <Pressable onPress={() => setEditingName(true)}>
                    <Ionicons name="pencil" size={24} color={Colors.light.tint} />
                  </Pressable>
                </View>
              )}

              <View style={{ marginBottom: 8 }}>
                <ThemedText style={{ opacity: 0.8, marginBottom: 4 }}>Banca</ThemedText>
                <ThemedTextInput
                  value={banca}
                  onChangeText={setBanca}
                  onBlur={async () => { await updateFolderSettings(folderId, { banca }); }}
                  placeholder="Ex.: FGV, CESPE, UNIRV"
                  placeholderTextColor={Colors.light.placeholder}
                  style={styles.input}
                />
                <View style={{ height: 6 }} />
                <ThemedText style={{ opacity: 0.8, marginBottom: 6 }}>Tipo de questão</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={async () => { setQuestionType('MC'); await updateFolderSettings(folderId, { question_type: 'MC' }); }}
                    style={[styles.chip, { borderColor: border, backgroundColor: questionType === 'MC' ? Colors.light.tintBorder : 'transparent' }]}
                  >
                    <ThemedText>Multipla escolha</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={async () => { setQuestionType('TF'); await updateFolderSettings(folderId, { question_type: 'TF' }); }}
                    style={[styles.chip, { borderColor: border, backgroundColor: questionType === 'TF' ? Colors.light.tintBorder : 'transparent' }]}
                  >
                    <ThemedText>Verdadeiro/Falso</ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={{ marginBottom: 8 }}>
                <ThemedText type="subtitle" style={{ marginBottom: 6 }}>Nova categoria</ThemedText>
                <View style={styles.row}>
                  <ThemedTextInput
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder="Ex.: Português, Matemática, Direito Adm..."
                    style={[styles.input]}
                  />
                  <Pressable onPress={onAddCategory}>
                    <ThemedText style={{ color: Colors.light.tint }}>Adicionar</ThemedText>
                  </Pressable>
                </View>
              </View>

              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Categorias nesta pasta</ThemedText>
            </View>
          }
          renderItem={({ item, drag, isActive }: { item: any; drag: () => void; isActive: boolean }) => (
            <Pressable
              style={[styles.listItem, { opacity: isActive ? 0.95 : 1, backgroundColor: surface, borderColor: border }]}
              onPress={() => router.push({ pathname: '/category' as any, params: { id: String(item.id), name: item.name } })}
              onLongPress={drag}
              delayLongPress={120}
            >
              <View style={{ flexDirection: 'row', gap: 8, flex: 1, alignItems: 'flex-start' }}>
                <Ionicons name="book" size={20} color={Colors.light.tint} />
                <ThemedText style={{ flex: 1, flexWrap: 'wrap' }}>{item.name}</ThemedText>
              </View>
              <Pressable onPress={(e) => { e.stopPropagation(); onDeleteCategory(item.id); }}>
                <Ionicons name="trash" size={20} color={Colors.light.tint} />
              </Pressable>
            </Pressable>
          )}
          onDragEnd={async ({ data }: { data: any[] }) => {
            const ordered = data as any[];
            const orderedIds = ordered.map((c) => c.id);
            await reorderCategories(orderedIds);
            setCategories(ordered as any[]);
            await load();
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 16, paddingHorizontal: 16 }}
        />
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
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  listItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tintBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tintBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
});


