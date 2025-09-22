import React from 'react';
import { StyleSheet, View, Button, FlatList, Pressable } from 'react-native';
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
                  <Button title="Adicionar" onPress={onAdd} />
                </View>
              </View>

              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Categorias</ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.listItem}
              onPress={() => router.push({ pathname: '/categories/[id]' as any, params: { id: String(item.id), name: item.name } })}
            >
              <ThemedText>{item.name}</ThemedText>
              <Button title="Excluir" onPress={() => onDelete(item.id)} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={<View style={{ height: 12 }} />}
        />

        <Button title="Configurar IA (Gemini)" onPress={() => router.push('/modal' as any)} />
      </ThemedView>
    </SafeAreaView>
  );
}


function QuestionsTab() {
  const { getStatsByCategory } = useAnswerRepository();
  const [stats, setStats] = React.useState<Array<{ category_name: string | null; total: number; acertos: number; erros: number }>>([]);
  React.useEffect(() => { (async () => setStats(await getStatsByCategory()))(); }, [getStatsByCategory]);
  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Questões</ThemedText>
        <FlatList
          data={stats}
          keyExtractor={(i, idx) => String(i.category_name ?? 'Geral') + idx}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <ThemedText type="defaultSemiBold">{item.category_name || 'Geral'}</ThemedText>
              <ThemedText>Acertos: {item.acertos} | Erros: {item.erros} | Total: {item.total}</ThemedText>
            </View>
          )}
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
  listItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});


