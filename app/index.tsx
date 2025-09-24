import React from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useCategoryRepository } from '@/lib/repositories';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnswerRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme'; 
import { ThemedTextInput } from '@/components/ThemedTextInput';

function HomeTab() {
  const router = useRouter();
  const { listCategories, createCategory, deleteCategory } = useCategoryRepository();
  const [name, setName] = React.useState('');
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([]);

  const load = React.useCallback(async () => {
    const data = await listCategories();
    setCategories(data);
  }, [listCategories]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createCategory(trimmed);
    setName('');
    await load();
  }

  async function onDelete(id: number) {
    await deleteCategory(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <FlatList
          data={categories}
          keyExtractor={(i) => String(i.id)}
          ListHeaderComponent={
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText type="title" style={styles.title}>RememberFlash</ThemedText>
              </View>
              <ThemedText style={styles.subtitle}>Seus estudos, simples e minimalistas.</ThemedText>

              <View style={styles.card}>
                <ThemedText type="subtitle">Nova categoria</ThemedText>
                <View style={styles.row}>
                  <ThemedTextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Português, Matemática, Direito Adm..."
                    style={[styles.input]}
                  />
                  <Pressable onPress={onAdd}>
                    <ThemedText style={{ color: Colors.light.tint }}>Adicionar</ThemedText>
                  </Pressable>
                </View>
              </View>

              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Categorias</ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.listItem}
              onPress={() => router.push({ pathname: '/category' as any, params: { id: String(item.id), name: item.name } })}
            >
              <View style={{ flexDirection: 'row', gap: 8, flex: 1, alignItems: 'flex-start' }}>
                <Ionicons name="folder" size={20} color={Colors.light.tint} />
                <ThemedText style={{ flex: 1, flexWrap: 'wrap' }}>{item.name}</ThemedText>
              </View>
              <Pressable onPress={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                <Ionicons name="trash" size={20} color={Colors.light.tint} />
              </Pressable>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={<View style={{ height: 12 }} />}
        />

        <Pressable onPress={() => router.push('/modal' as any)}>
          <ThemedText type="link">Configurar IA (Gemini)</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}


function QuestionsTab() {
  const { getStatsByCategory } = useAnswerRepository();
  const [stats, setStats] = React.useState<Array<{ category_name: string | null; total: number; acertos: number; erros: number }>>([]);
  React.useEffect(() => { (async () => setStats(await getStatsByCategory()))(); }, [getStatsByCategory]);
  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;
  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Questões</ThemedText>
        <FlatList
          data={stats}
          keyExtractor={(i, idx) => String(i.category_name ?? 'Geral') + idx}
          renderItem={({ item }) => {
            const name = item.category_name || 'Geral';
            const total = Math.max(0, item.total || 0);
            const acertos = Math.max(0, item.acertos || 0);
            const erros = Math.max(0, item.erros || 0);
            const perc = total > 0 ? Math.round((acertos / total) * 100) : 0;
            return (
              <View style={[styles.statItem, { backgroundColor: surface, borderColor: border }]}> 
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Ionicons name="stats-chart" size={20} color={tint} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <ThemedText type="defaultSemiBold" style={{ flex: 1, flexWrap: 'wrap' }}>{name}</ThemedText>
                      <View style={[styles.totalPill, { borderColor: border, backgroundColor: tint + '33' }]}>
                        <ThemedText style={{ color: Colors.light.background }}>Total: {total}</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.progressBar, { borderColor: border }]}>
                      <View style={[styles.progressFill, { width: `${perc}%`, backgroundColor: tint }]} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <ThemedText>Acertos: {acertos} ({perc}%)</ThemedText>
                      <ThemedText>Erros: {erros}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  const [tab, setTab] = React.useState<'home' | 'questions'>('home');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;
  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      {tab === 'home' ? <HomeTab /> : <QuestionsTab />}
      <View
        style={[
          styles.fabBar,
          {
            bottom: Math.max(insets.bottom, 12),
            backgroundColor: surface,
            borderColor: border,
          },
        ]}>
        <TabButton
          active={tab === 'home'}
          label="Home"
          iconName="home"
          tint={tint}
          onPress={() => setTab('home')}
        />
        <TabButton
          active={tab === 'questions'}
          label="Questões"
          iconName="school"
          tint={tint}
          onPress={() => setTab('questions')}
        />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ active, label, iconName, tint, onPress }: { active: boolean; label: string; iconName: keyof typeof Ionicons.glyphMap; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <View style={[styles.iconPill, active ? { backgroundColor: tint + '33' } : null]}>
        <Ionicons name={iconName} size={22} color={active ? tint : '#9BA1A6'} />
      </View>
      <ThemedText style={[styles.tabLabel, active ? { color: tint } : { opacity: 0.8 }]}>{label}</ThemedText>
    </Pressable>
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
  },
  statItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
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
  fabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  totalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});


