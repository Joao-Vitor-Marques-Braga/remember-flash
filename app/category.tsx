import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateQuestionsByCategory } from '@/lib/ai';
import { useCardRepository, useCategoryRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const categoryId = Number(params.id);
  const navigation = useNavigation();
  const router = useRouter();
  const { listCardsByCategory, createCard, deleteCard, updateCard } = useCardRepository();
  const { renameCategory, deleteCategory } = useCategoryRepository();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [cards, setCards] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [loadingIA, setLoadingIA] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState<string>(String(params.name || ''));
  const [editTitle, setEditTitle] = React.useState<Record<number, string>>({});
  const [editDesc, setEditDesc] = React.useState<Record<number, string>>({});

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  const load = React.useCallback(async () => {
    if (!categoryId) return;
    const data = await listCardsByCategory(categoryId);
    setCards(data);
  }, [categoryId, listCardsByCategory]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (params.name) {
      navigation.setOptions({ title: String(params.name) });
    }
  }, [navigation, params.name]);

  async function onAdd() {
    if (!title.trim()) return;
    await createCard({ categoryId, title: title.trim(), description: description.trim() || null });
    setTitle('');
    setDescription('');
    await load();
  }

  async function onGenerate() {
    try {
      setLoadingIA(true);
      const items = await generateQuestionsByCategory(params.name || 'Geral', 5);
      if (!items.length) {
        Alert.alert('Aviso', 'Não foi possível interpretar a resposta da IA em JSON.');
        setLoadingIA(false);
        return;
      }
      router.push({ pathname: '/practice' as any, params: { data: JSON.stringify(items), name: String(params.name || 'Prática'), categoryId: String(categoryId) } });
      setLoadingIA(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao gerar questões');
      setLoadingIA(false);
    }
  }

  async function onGenerate10() {
    try {
      setLoadingIA(true);
      const items = await generateQuestionsByCategory(params.name || 'Geral', 10);
      if (!items.length) {
        Alert.alert('Aviso', 'Não foi possível interpretar a resposta da IA em JSON.');
        setLoadingIA(false);
        return;
      }
      router.push({ pathname: '/practice' as any, params: { data: JSON.stringify(items), name: String(params.name || 'Prática'), categoryId: String(categoryId) } });
      setLoadingIA(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao gerar questões');
      setLoadingIA(false);
    }
  }

  async function onGeneratePrompt() {
    router.push({ pathname: '/prompt' as any, params: { categoryId: String(categoryId) } });
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function onDeleteCard(id: number) {
    await deleteCard(id);
    await load();
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => String(c.title).toLowerCase().includes(q) || String(c.description ?? '').toLowerCase().includes(q));
  }, [cards, search]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onDeleteCategory(id: number) {
    await deleteCategory(id);
    router.push('/');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.container}>
          <KeyboardAwareFlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            enableOnAndroid={true}
            extraScrollHeight={100}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            ListHeaderComponent={
              <View>
                {editingName ? (
                  <View style={[styles.panel, { backgroundColor: surface, borderColor: border, marginBottom: 8 }]}>
                    <ThemedText type="subtitle">Renomear categoria</ThemedText>
                    <ThemedTextInput value={categoryName} onChangeText={setCategoryName} style={styles.input} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable style={styles.cancelButton} onPress={() => { setCategoryName(String(params.name || '')); setEditingName(false); }}>
                        <ThemedText style={{ color: Colors.light.background }}>Cancelar</ThemedText>
                      </Pressable>
                      <Pressable style={styles.saveButton} onPress={async () => { await renameCategory(categoryId, categoryName.trim()); navigation.setOptions({ title: categoryName.trim() }); setEditingName(false); }}>
                        <ThemedText style={{ color: Colors.light.background }}>Salvar</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 8 }}>
                    <ThemedText type="title">{categoryName || 'Cards'}</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Pressable onPress={() => setEditingName(true)}>
                        <Ionicons name="pencil" size={24} color={Colors.light.tint} />
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={[styles.panel, { backgroundColor: surface, borderColor: border, marginBottom: 8 }]}>
                  <ThemedText type="subtitle">Ações rápidas</ThemedText>
                  <View style={styles.chipsRow}>
                    <Pressable onPress={onGenerate} disabled={loadingIA} style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]}>
                      <ThemedText>Gerar 5 questões</ThemedText>
                    </Pressable>
                    <Pressable onPress={onGenerate10} disabled={loadingIA} style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]}>
                      <ThemedText>Gerar 10 questões</ThemedText>
                    </Pressable>
                    <Pressable onPress={onGeneratePrompt} disabled={loadingIA} style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]}>
                      <ThemedText>Alterar prompt de questões</ThemedText>
                    </Pressable>
                    <Link href="/modal" asChild>
                      <Pressable style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]} >
                        <ThemedText>Configurar IA</ThemedText>
                      </Pressable>
                    </Link>
                    {loadingIA ? (
                      <View style={{ marginLeft: 8 }}>
                        <ActivityIndicator />
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.panel, { backgroundColor: surface, borderColor: border, marginBottom: 8 }]}>
                <ThemedText type="subtitle">Novo card</ThemedText>
                
                {/* REMOVA o KeyboardAvoidingView e o ScrollView que estavam aqui */}
                <ThemedTextInput
                  placeholder="Título"
                  placeholderTextColor={Colors.light.placeholder}
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
                <TextInput
                  editable
                  multiline={true}
                  numberOfLines={4}
                  placeholder="Descrição"
                  placeholderTextColor={Colors.light.placeholder}
                  value={description}
                  onChangeText={setDescription}
                  style={styles.input}
                />
                
                <Pressable onPress={onAdd} style={styles.addButton}>
                  <ThemedText style={{ color: Colors.light.background }}>Adicionar</ThemedText>
                </Pressable>
              </View>

                <ThemedTextInput
                  placeholderTextColor={Colors.light.placeholder}
                  placeholder="Buscar por título ou descrição"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.input}
                />

                <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Cards</ThemedText>
              </View>
            }
            renderItem={({ item }) => {
              const options = item.options_json ? JSON.parse(item.options_json) as Record<string, string> : null;
              return (
                <Pressable style={[styles.card, { backgroundColor: surface, borderColor: border }]} onPress={() => toggleExpand(item.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                    <Pressable onPress={(e) => { e.stopPropagation(); setEditTitle((prev) => ({ ...prev, [item.id]: item.title })); setEditDesc((prev) => ({ ...prev, [item.id]: item.description || '' })); setExpanded((prev) => ({ ...prev, [item.id]: true })); }}>
                      <Ionicons name="pencil" size={20} color={Colors.light.tint} />
                    </Pressable>
                  </View>
                  {options ? (
                    <View style={{ gap: 6 }}>
                      {(['a', 'b', 'c', 'd'] as const).map((key) => {
                        const label = options[key];
                        if (!label) return null;
                        const isCorrect = item.correct === key;
                        return (
                          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ThemedText type="defaultSemiBold">{key.toUpperCase()}.</ThemedText>
                            <ThemedText style={{ opacity: isCorrect ? 1 : 0.85 }}>{label}</ThemedText>
                            {isCorrect ? <ThemedText type="link">   (correta)</ThemedText> : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                  {item.description ? (
                    <ThemedText numberOfLines={expanded[item.id] ? undefined : 2}>
                      {item.description}
                    </ThemedText>
                  ) : null}
                  <View style={{ height: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <Pressable onPress={(e) => { e.stopPropagation(); onDeleteCard(item.id); }}>
                      <ThemedText type="link">Excluir</ThemedText>
                    </Pressable>
                  </View>
                  {expanded[item.id] ? (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      <ThemedTextInput
                        placeholderTextColor={Colors.light.placeholder}
                        placeholder="Editar título"
                        value={editTitle[item.id] ?? ''}
                        onChangeText={(t) => setEditTitle((prev) => ({ ...prev, [item.id]: t }))}
                        style={styles.input}
                      />
                      <ThemedTextInput
                        placeholderTextColor={Colors.light.placeholder}
                        placeholder="Editar descrição"
                        value={editDesc[item.id] ?? ''}
                        onChangeText={(t) => setEditDesc((prev) => ({ ...prev, [item.id]: t }))}
                        style={styles.input}
                      />
                      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                        <Pressable
                          style={styles.cancelButton}
                          onPress={() => {
                            setExpanded((prev) => ({ ...prev, [item.id]: false }));
                          }}
                        >
                          <ThemedText style={{ color: Colors.light.text }}>Cancelar</ThemedText>
                        </Pressable>
                        <Pressable
                          style={styles.saveButton}
                          onPress={async () => {
                            await updateCard(item.id, {
                              title: editTitle[item.id] ?? item.title,
                              description: editDesc[item.id] ?? item.description ?? '',
                            });
                            await load();
                            setExpanded((prev) => ({ ...prev, [item.id]: false }));
                          }}
                        >
                          <ThemedText style={{ color: Colors.light.tintLight }}>Salvar</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => (
              <View style={[styles.empty, { borderColor: border }]}>
                <ThemedText>Nenhum card ainda. Crie um ou gere com IA.</ThemedText>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </ThemedView>
      </KeyboardAvoidingView>
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
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  empty: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tintBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
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
