import React from 'react';
import { StyleSheet, View, Pressable, Button, Dimensions, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { useAnswerRepository, useCardRepository } from '@/lib/repositories';

type Item = {
  title: string;
  description: string;
  options?: { a: string; b: string; c: string; d: string };
  correct?: 'a' | 'b' | 'c' | 'd';
};

export default function PracticeModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string; name?: string }>();
  const { saveAnswer } = useAnswerRepository();
  const { createCard } = useCardRepository();
  const items: Item[] = React.useMemo(() => {
    try {
      const parsed = JSON.parse(params.data || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.data]);

  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [confirmed, setConfirmed] = React.useState(false);
  const [results, setResults] = React.useState<Array<{ idx: number; selected: 'a'|'b'|'c'|'d'; correct: 'a'|'b'|'c'|'d'|undefined; isCorrect: boolean; topic: string }>>([]);
  const [showSummary, setShowSummary] = React.useState(false);
  const [saved, setSaved] = React.useState<Record<number, boolean>>({});

  const width = Dimensions.get('window').width;
  const x = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  function onSelect(key: 'a' | 'b' | 'c' | 'd') {
    if (confirmed) return;
    setSelected(key);
  }

  function onConfirm() {
    if (!selected) return;
    setConfirmed(true);
    // Registra resultado desta questão se ainda não registrado
    const it = items[index];
    const correct = it?.correct;
    const topic = deriveTopic(it?.title || String(params.name || ''));
    setResults((prev) => {
      if (prev.some((r) => r.idx === index)) return prev;
      return prev.concat({ idx: index, selected, correct, isCorrect: selected === correct, topic });
    });
    // Persistência
    try {
      saveAnswer({
        categoryId: Number((params as any).categoryId) || null,
        categoryName: String(params.name || ''),
        title: items[index]?.title || '',
        selected: selected || null,
        correct: (correct as string | null) ?? null,
        isCorrect: selected === correct,
      });
    } catch {}
  }

  function next() {
    if (!confirmed) return; // não avança sem confirmar
    if (index < items.length - 1) {
      const nextIndex = index + 1;
      x.value = withSpring(-width, {}, (finished) => {
        if (finished) {
          x.value = width;
          runOnJS(setIndex)(nextIndex);
          runOnJS(setSelected)(null);
          runOnJS(setConfirmed)(false);
          x.value = withSpring(0);
        }
      });
    } else {
      // Exibe resumo ao invés de fechar imediatamente
      setShowSummary(true);
    }
  }

  const item = items[index];

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{params.name || 'Prática'}</ThemedText>
        <View style={{ height: 12 }} />
        {!showSummary ? (
          <>
            <View style={styles.contentFlex}>
              <Animated.View style={[styles.card, styles.cardFlex, cardStyle]}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
                  <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>{item?.title}</ThemedText>
                  {(['a','b','c','d'] as const).map((key) => {
                    const label = item?.options?.[key];
                    if (!label) return null;
                    const isChosen = selected === key;
                    const isCorrect = item?.correct === key;
                    const borderColor = confirmed ? (isCorrect ? '#22c55e' : (isChosen ? '#ef4444' : undefined)) : (isChosen ? '#0a7ea4' : undefined);
                    return (
                      <Pressable key={key} onPress={() => onSelect(key)} style={[styles.option, borderColor ? { borderColor } : null ]}>
                        <ThemedText type="defaultSemiBold">{key.toUpperCase()}.</ThemedText>
                        <ThemedText>{label}</ThemedText>
                      </Pressable>
                    );
                  })}
                  {confirmed ? (
                    <>
                      <View style={{ height: 12 }} />
                      <ThemedText>{item?.description}</ThemedText>
                      <View style={{ height: 8 }} />
                      <Button
                        title={saved[index] ? 'Salvo' : 'Salvar como card'}
                        onPress={async () => {
                          if (saved[index]) return;
                          const catId = Number((params as any).categoryId) || null;
                          if (!catId) {
                            return;
                          }
                          try {
                            await createCard({
                              categoryId: catId,
                              title: item?.title || '',
                              description: item?.description || '',
                              options: item?.options ?? null,
                              correct: (item?.correct as any) ?? null,
                            });
                            setSaved((prev) => ({ ...prev, [index]: true }));
                          } catch {}
                        }}
                        disabled={!!saved[index] || !((params as any).categoryId)}
                      />
                    </>
                  ) : null}
                </ScrollView>
              </Animated.View>
            </View>
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
              <Button title="Confirmar" onPress={onConfirm} disabled={!selected || confirmed} />
              <Button title={index < items.length - 1 ? 'Próxima' : 'Concluir'} onPress={next} disabled={!confirmed} />
            </View>
          </>
        ) : (
          <SummaryView results={results} total={items.length} onClose={() => router.back()} />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

function deriveTopic(title: string): string {
  const t = title || '';
  const colon = t.indexOf(':');
  if (colon > 0) return t.slice(0, colon).trim();
  const dash = t.indexOf(' - ');
  if (dash > 0) return t.slice(0, dash).trim();
  const emdash = t.indexOf(' — ');
  if (emdash > 0) return t.slice(0, emdash).trim();
  return t.split(' ').slice(0, 2).join(' ').trim();
}

function SummaryView({ results, total, onClose }: { results: Array<{ idx: number; selected: 'a'|'b'|'c'|'d'; correct: 'a'|'b'|'c'|'d'|undefined; isCorrect: boolean; topic: string }>; total: number; onClose: () => void; }) {
  const acertos = results.filter((r) => r.isCorrect).length;
  const erros = total - acertos;
  const porAssunto = results.reduce<Record<string, { acertos: number; erros: number }>>((acc, r) => {
    const key = r.topic || 'Geral';
    acc[key] = acc[key] || { acertos: 0, erros: 0 };
    if (r.isCorrect) acc[key].acertos += 1; else acc[key].erros += 1;
    return acc;
  }, {});

  return (
    <View style={{ flex: 1 }}>
      <ThemedText type="subtitle">Resultado</ThemedText>
      <View style={{ height: 8 }} />
      <ThemedText>Total: {total}</ThemedText>
      <ThemedText>Acertos: {acertos}</ThemedText>
      <ThemedText>Erros: {erros}</ThemedText>
      <View style={{ height: 12 }} />
      <ThemedText type="subtitle">Por assunto</ThemedText>
      <ScrollView contentContainerStyle={{ gap: 8 }}>
        {Object.entries(porAssunto).map(([topic, vals]) => (
          <View key={topic} style={{ borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 }}>
            <ThemedText type="defaultSemiBold">{topic}</ThemedText>
            <ThemedText>Acertos: {vals.acertos} | Erros: {vals.erros}</ThemedText>
          </View>
        ))}
        <View style={{ height: 12 }} />
        <Button title="Fechar" onPress={onClose} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  contentFlex: {
    flex: 1,
  },
  cardFlex: {
    flex: 1,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
});


