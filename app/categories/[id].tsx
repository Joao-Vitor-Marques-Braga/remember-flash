import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View, Button, Alert, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useCardRepository, useCategoryRepository } from '@/lib/repositories';
import { generateQuestionsByCategory } from '@/lib/ai';
import { Link, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedTextInput } from '@/components/ThemedTextInput';

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const categoryId = Number(params.id);
  const navigation = useNavigation();
  const router = useRouter();
  const { listCardsByCategory, createCard, deleteCard, updateCard } = useCardRepository();
  const { renameCategory } = useCategoryRepository();
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

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedView style={styles.container}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListHeaderComponent={
            <View>
              {editingName ? (
                <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}> 
                  <ThemedText type="subtitle">Renomear categoria</ThemedText>
                  <ThemedTextInput value={categoryName} onChangeText={setCategoryName} style={styles.input} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button title="Cancelar" onPress={() => { setCategoryName(String(params.name || '')); setEditingName(false); }} />
                    <Button title="Salvar" onPress={async () => { await renameCategory(categoryId, categoryName.trim()); navigation.setOptions({ title: categoryName.trim() }); setEditingName(false); }} />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemedText type="title">{categoryName || 'Cards'}</ThemedText>
                  <Button title="Editar nome" onPress={() => setEditingName(true)} />
                </View>
              )}

              <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}> 
                <ThemedText type="subtitle">Ações rápidas</ThemedText>
                <View style={styles.chipsRow}>
                  <Pressable onPress={onGenerate} disabled={loadingIA} style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]}>
                    <ThemedText>IA (5)</ThemedText>
                  </Pressable>
                  <Pressable onPress={onGenerate10} disabled={loadingIA} style={[styles.chip, { borderColor: border, opacity: loadingIA ? 0.6 : 1 }]}>
                    <ThemedText>IA (10)</ThemedText>
                  </Pressable>
                  <Link href="/modal" asChild>
                    <Pressable style={[styles.chip, { borderColor: border }]}>
                      <ThemedText>Chave IA</ThemedText>
                    </Pressable>
                  </Link>
                  {loadingIA ? (
                    <View style={{ marginLeft: 8 }}>
                      <ActivityIndicator />
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}> 
                <ThemedText type="subtitle">Novo card</ThemedText>
                <ThemedTextInput placeholder="Título" value={title} onChangeText={setTitle} style={styles.input} />
                <ThemedTextInput placeholder="Descrição" value={description} onChangeText={setDescription} style={styles.input} />
                <Button title="Adicionar" onPress={onAdd} />
              </View>

              <ThemedTextInput
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
                <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>{item.title}</ThemedText>
                {options ? (
                  <View style={{ gap: 6 }}>
                    {(['a','b','c','d'] as const).map((key) => {
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Pressable onPress={() => {
                    // abrir modo de edição inline e preparar estados
                    setEditTitle((prev) => ({ ...prev, [item.id]: item.title }));
                    setEditDesc((prev) => ({ ...prev, [item.id]: item.description || '' }));
                    setExpanded((prev) => ({ ...prev, [item.id]: true }));
                  }}>
                    <ThemedText type="link">Editar</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => onDeleteCard(item.id)}>
                    <ThemedText type="link">Excluir</ThemedText>
                  </Pressable>
                </View>
                {expanded[item.id] ? (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <ThemedTextInput
                      placeholder="Editar título"
                      value={editTitle[item.id] ?? ''}
                      onChangeText={(t) => setEditTitle((prev) => ({ ...prev, [item.id]: t }))}
                      style={styles.input}
                    />
                    <ThemedTextInput
                      placeholder="Editar descrição"
                      value={editDesc[item.id] ?? ''}
                      onChangeText={(t) => setEditDesc((prev) => ({ ...prev, [item.id]: t }))}
                      style={styles.input}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                      <Button
                        title="Cancelar"
                        onPress={() => {
                          setExpanded((prev) => ({ ...prev, [item.id]: false }));
                        }}
                      />
                      <Button
                        title="Salvar"
                        onPress={async () => {
                          await updateCard(item.id, {
                            title: editTitle[item.id] ?? item.title,
                            description: editDesc[item.id] ?? item.description ?? '',
                          });
                          await load();
                          setExpanded((prev) => ({ ...prev, [item.id]: false }));
                        }}
                      />
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
});


