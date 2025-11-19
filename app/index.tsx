import React from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useFolderRepository } from '@/lib/repositories';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnswerRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme'; 
import { ThemedTextInput } from '@/components/ThemedTextInput';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useEssayRepository } from '@/lib/repositories';
import { ScheduleTab } from '@/components/ScheduleTab';

function HomeTab() {
  const router = useRouter();
  const { listFolders, createFolder, deleteFolder, reorderFolders } = useFolderRepository();
  const [name, setName] = React.useState('');
  const [folders, setFolders] = React.useState<{ id: number; name: string }[]>([]);

  const load = React.useCallback(async () => {
    const data = await listFolders();
    setFolders(data);
  }, [listFolders]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createFolder(trimmed);
    setName('');
    await load();
  }

  async function onDelete(id: number) {
    await deleteFolder(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <DraggableFlatList
          data={folders}
          keyExtractor={(i) => String(i.id)}
          activationDistance={8}
          ListHeaderComponent={
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText type="title" style={styles.title}>RememberFlash</ThemedText>
              </View>
              <ThemedText style={styles.subtitle}>Seus estudos, simples e minimalistas.</ThemedText>

              <View style={styles.card}>
                <ThemedText type="subtitle">Nova pasta</ThemedText>
                <View style={styles.row}>
                  <ThemedTextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Concursos, Faculdade, Escola..."
                    style={[styles.input]}
                  />
                  <Pressable onPress={onAdd}>
                    <ThemedText style={{ color: Colors.light.tint }}>Adicionar</ThemedText>
                  </Pressable>
                </View>
              </View>

              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>Pastas</ThemedText>
            </View>
          }
          renderItem={({ item, drag, isActive }: { item: any; drag: () => void; isActive: boolean }) => (
            <Pressable
              style={[styles.listItem, { opacity: isActive ? 0.95 : 1 }]}
              onPress={() => router.push({ pathname: '/folder' as any, params: { id: String(item.id), name: item.name } })}
              onLongPress={drag}
              delayLongPress={120}
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
          onDragEnd={async ({ data }: { data: any[] }) => {
            setFolders(data as any[]);
            const orderedIds = (data as any[]).map((f) => f.id);
            await reorderFolders(orderedIds);
            await load();
          }}
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
  const { getStatsByCategory, reorderStats } = useAnswerRepository();
  const [stats, setStats] = React.useState<Array<{ category_name: string | null; total: number; acertos: number; erros: number; order_index: number }>>([]);
  
  const load = React.useCallback(async () => {
    const data = await getStatsByCategory();
    setStats(data);
  }, [getStatsByCategory]);

  React.useEffect(() => {
    load();
  }, [load]);

  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;
  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Questões</ThemedText>
        <DraggableFlatList
          data={stats}
          keyExtractor={(i, idx) => String(i.category_name ?? 'Geral') + idx}
          activationDistance={8}
          renderItem={({ item, drag, isActive }: { item: any; drag: () => void; isActive: boolean }) => {
            const name = item.category_name || 'Geral';
            const total = Math.max(0, item.total || 0);
            const acertos = Math.max(0, item.acertos || 0);
            const erros = Math.max(0, item.erros || 0);
            const perc = total > 0 ? Math.round((acertos / total) * 100) : 0;
            return (
              <Pressable
                style={[
                  styles.statItem, 
                  { 
                    backgroundColor: surface, 
                    borderColor: border,
                    opacity: isActive ? 0.8 : 1,
                    transform: isActive ? [{ scale: 1.02 }] : [{ scale: 1 }],
                    shadowOpacity: isActive ? 0.3 : 0.1,
                    elevation: isActive ? 8 : 2,
                  }
                ]}
                onLongPress={drag}
                delayLongPress={120}
              > 
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
              </Pressable>
            );
          }}
          onDragEnd={async ({ data }: { data: any[] }) => {
            setStats(data as any[]);
            const orderedCategoryNames = (data as any[]).map((s) => s.category_name);
            await reorderStats(orderedCategoryNames);
            // Não precisa chamar load() pois já atualizamos o estado local
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

function EssayTab() {
  const router = useRouter();
  const { listEssays, deleteEssay } = useEssayRepository();
  const [essays, setEssays] = React.useState<Array<{ id: number; title: string | null; score: number | null; created_at: string | null }>>([]);
  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;

  const loadEssays = React.useCallback(async () => {
    const data = await listEssays();
    setEssays(data);
  }, [listEssays]);

  React.useEffect(() => {
    loadEssays();
  }, [loadEssays]);

  const handleDeleteEssay = async (id: number) => {
    await deleteEssay(id);
    await loadEssays();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Redações</ThemedText>
        <ThemedText style={styles.subtitle}>
          Suas redações analisadas e salvas
        </ThemedText>

        {/* Botão para nova análise */}
        <Pressable
          style={[styles.card, { backgroundColor: tint + '20', borderColor: tint }]}
          onPress={() => router.push('/essay' as any)}
        >
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.iconPill, { backgroundColor: tint }]}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ color: tint }}>Nova Análise</ThemedText>
              <ThemedText style={{ opacity: 0.7, fontSize: 14 }}>
                Escreva ou envie foto da redação para correção
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tint} />
          </View>
        </Pressable>

        {/* Lista de redações */}
        {essays.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Redações Salvas ({essays.length})
            </ThemedText>
            <FlatList
              data={essays}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.card, { backgroundColor: surface, borderColor: border }]}
                  onPress={() => router.push({ pathname: '/essay' as any, params: { essayId: String(item.id) } })}
                >
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={[styles.iconPill, { backgroundColor: item.score ? (item.score >= 7 ? '#4CAF50' : item.score >= 5 ? '#FF9800' : '#F44336') + '33' : tint + '33' }]}>
                      <Ionicons 
                        name="document-text" 
                        size={24} 
                        color={item.score ? (item.score >= 7 ? '#4CAF50' : item.score >= 5 ? '#FF9800' : '#F44336') : tint} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {item.title || 'Redação'}
                      </ThemedText>
                      <ThemedText style={{ opacity: 0.7, fontSize: 14 }}>
                        {formatDate(item.created_at)}
                      </ThemedText>
                      {item.score && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="star" size={14} color={item.score >= 7 ? '#4CAF50' : item.score >= 5 ? '#FF9800' : '#F44336'} />
                          <ThemedText style={{ fontSize: 14, fontWeight: '600', color: item.score >= 7 ? '#4CAF50' : item.score >= 5 ? '#FF9800' : '#F44336' }}>
                            {item.score.toFixed(1)}/10
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <Pressable 
                      onPress={(e) => { e.stopPropagation(); handleDeleteEssay(item.id); }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash" size={20} color="#F44336" />
                    </Pressable>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="document-outline" size={48} color={tint} style={{ opacity: 0.5 }} />
            <ThemedText style={{ opacity: 0.7, textAlign: 'center', marginTop: 12 }}>
              Nenhuma redação salva ainda.{'\n'}
              Faça sua primeira análise!
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  const [tab, setTab] = React.useState<'home' | 'questions' | 'essay' | 'schedule'>('home');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = Colors[colorScheme].tint;
  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      {tab === 'home' ? <HomeTab /> : tab === 'questions' ? <QuestionsTab /> : tab === 'essay' ? <EssayTab /> : <ScheduleTab />}
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
        <TabButton
          active={tab === 'essay'}
          label="Redação"
          iconName="create"
          tint={tint}
          onPress={() => setTab('essay')}
        />
        <TabButton
          active={tab === 'schedule'}
          label="Cronograma"
          iconName="calendar"
          tint={tint}
          onPress={() => setTab('schedule')}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
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


