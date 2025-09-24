import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/ThemedTextInput';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateQuestionsByCategory, generateFlashcardsFromPdf } from '@/lib/ai';
import { useCardRepository, useCategoryRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const categoryId = Number(params.id);
  const navigation = useNavigation();
  const router = useRouter();
  const { listCardsByCategory, createCard, deleteCard, updateCard, reorderCards } = useCardRepository();
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
  const [showQtyModal, setShowQtyModal] = React.useState(false);
  const [pdfQty, setPdfQty] = React.useState<string>('10');
  const [selectedPdfUri, setSelectedPdfUri] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfLoadingMsg, setPdfLoadingMsg] = React.useState('Estamos gerando seu resumo...');
  const [draggingId, setDraggingId] = React.useState<number | null>(null);
  const [dropTarget, setDropTarget] = React.useState<'top' | 'bottom' | null>(null);

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

  async function onPickPdf() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: false, copyToCacheDirectory: true });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file?.uri) return;
      setSelectedPdfUri(file.uri);
      setPdfQty('10');
      setShowQtyModal(true);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao selecionar PDF');
    }
  }

  async function onConfirmPdfQty() {
    if (!selectedPdfUri) {
      setShowQtyModal(false);
      return;
    }
    const qty = Math.max(1, Math.min(50, Number(pdfQty) || 10));
    setShowQtyModal(false);
    try {
      setPdfLoadingMsg('Lendo seu PDF...');
      setPdfLoading(true);
      const encoding: any = (FileSystem as any).EncodingType ? (FileSystem as any).EncodingType.Base64 : ('base64' as any);
      const base64 = await FileSystem.readAsStringAsync(selectedPdfUri, { encoding });
      setPdfLoadingMsg('Gerando flashcards com IA...');
      const items = await generateFlashcardsFromPdf(base64, qty);
      if (!items.length) {
        setPdfLoading(false);
        Alert.alert('Aviso', 'Não foi possível interpretar a resposta da IA em JSON.');
        return;
      }
      setPdfLoadingMsg('Salvando flashcards...');
      for (const it of items) {
        await createCard({
          categoryId,
          title: it.title,
          description: it.description ?? null,
          options: undefined,
          correct: undefined,
        });
      }
      await load();
      setPdfLoading(false);
      Alert.alert('Sucesso', `${items.length} flashcards adicionados à categoria.`);
    } catch (e: any) {
      setPdfLoading(false);
      Alert.alert('Erro', e?.message ?? 'Falha ao gerar questões a partir do PDF');
    }
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

  function moveItemToTop(id: number) {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  }

  function moveItemToBottom(id: number) {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
  }

  async function commitReorder() {
    try {
      const orderedIds = cards.map((c) => c.id);
      // persistir ordem
      const { useCardRepository } = await import('@/lib/repositories');
      // noop: já temos no escopo; apenas garante tipagem
    } finally {
      // nada
    }
  }

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
          <DraggableFlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            activationDistance={8}
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
                    <Pressable onPress={onPickPdf} disabled={loadingIA || pdfLoading} style={[styles.chip, { borderColor: border, opacity: (loadingIA || pdfLoading) ? 0.6 : 1 }]}> 
                      <ThemedText>Gerar Flashcards a partir de PDF</ThemedText>
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
            renderItem={({ item, drag, isActive }: { item: any; drag: () => void; isActive: boolean }) => {
              const options = item.options_json ? JSON.parse(item.options_json) as Record<string, string> : null;
              return (
                <Pressable
                  style={[styles.card, { backgroundColor: surface, borderColor: border, opacity: isActive ? 0.95 : 1 }]}
                  onPress={() => toggleExpand(item.id)}
                  onLongPress={() => { if (!search.trim()) drag(); }}
                  delayLongPress={120}
                >
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
            onDragEnd={async ({ data }: { data: any[] }) => {
              setCards(data as any[]);
              if (!search.trim()) {
                const orderedIds = (data as any[]).map((c) => c.id);
                await reorderCards(categoryId, orderedIds);
                await load();
              }
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => (
              <View style={[styles.empty, { borderColor: border }]}>
                <ThemedText>Nenhum card ainda. Crie um ou gere com IA.</ThemedText>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
          />

          {/* Modal de quantidade de flashcards para PDF */}
          <Modal transparent visible={showQtyModal} animationType="fade" onRequestClose={() => setShowQtyModal(false)}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}> 
                <ThemedText type="subtitle">Quantos flashcards gerar?</ThemedText>
                <ThemedTextInput
                  placeholderTextColor={Colors.light.placeholder}
                  placeholder="Ex.: 10"
                  value={pdfQty}
                  onChangeText={setPdfQty}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                  <Pressable style={styles.cancelButton} onPress={() => setShowQtyModal(false)}>
                    <ThemedText style={{ color: Colors.light.text }}>Cancelar</ThemedText>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={onConfirmPdfQty}>
                    <ThemedText style={{ color: Colors.light.tintLight }}>Gerar</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal de loading do PDF */}
          <Modal transparent visible={pdfLoading} animationType="fade" onRequestClose={() => {}}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { alignItems: 'center', backgroundColor: surface, borderColor: border }]}> 
                <ActivityIndicator />
                <View style={{ height: 12 }} />
                <ThemedText>{pdfLoadingMsg}</ThemedText>
              </View>
            </View>
          </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
  },
  dragOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dropZone: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dropBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dropActive: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
