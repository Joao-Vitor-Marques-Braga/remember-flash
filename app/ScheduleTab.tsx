import { useThemeColor } from '@/hooks/use-theme-color';
import { useFolderRepository, useStudyRepository } from '@/lib/repositories';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { ThemedTextInput } from '../components/ThemedTextInput';

// Configuração do Calendário para PT-BR
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

export default function ScheduleTab() {
  const router = useRouter();
  const { listPlans, createPlan, getEvents, toggleEvent, updatePlanEvents, deletePlan } = useStudyRepository();
  const { listFolders } = useFolderRepository();
  
  const [plans, setPlans] = React.useState<any[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activePlan, setActivePlan] = React.useState<any>(null);
  const [showOptionsModal, setShowOptionsModal] = React.useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = React.useState(false);
  const [generatingMsg, setGeneratingMsg] = React.useState('Criando cronograma...');
  
  // Form States
  const [folders, setFolders] = React.useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState<number | null>(null);
  const [goal, setGoal] = React.useState('');
  const [examDate, setExamDate] = React.useState('');
  const [dailyMinutes, setDailyMinutes] = React.useState('60');
  const [maxTopics, setMaxTopics] = React.useState('2');
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1, 2, 3, 4, 5]); // Seg-Sex default

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');

  // Máscara de data: dd/mm/aaaa
  const maskDateInput = React.useCallback((value: string) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
        const p = await listPlans();
        setPlans(p);
        
        // Load events for a wide range (e.g., this month +/- 1 year)
        // For better perf, we should load based on visible month in calendar, but this is simpler for now
        const start = addDays(new Date(), -30);
        const end = addDays(new Date(), 365);
        const e = await getEvents(start, end);
        setEvents(e);
    } finally {
        setLoading(false);
    }
  }, [listPlans, getEvents]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Setup folders for dropdown
  React.useEffect(() => {
      if (showCreateModal) {
          listFolders().then(setFolders);
      }
  }, [showCreateModal, listFolders]);

  async function handleCreatePlan() {
      if (!selectedFolderId || !goal || !examDate || selectedDays.length === 0) {
          Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
          return;
      }
      
      // Validate Date
      const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!datePattern.test(examDate)) {
          Alert.alert('Erro', 'Data deve ser DD/MM/AAAA');
          return;
      }
      
      const [d, m, y] = examDate.split('/').map(Number);
      const isoDate = new Date(y, m - 1, d).toISOString();

      setShowCreateModal(false);
      setGeneratingMsg('Criando cronograma...');
      setShowGeneratingModal(true);
      setLoading(true);
      try {
          await createPlan({
              folderId: selectedFolderId,
              goal,
              examDate: isoDate,
              dailyMinutes: Number(dailyMinutes),
              studyDays: selectedDays,
              maxTopics: Number(maxTopics) || 1
          });
          setGeneratingMsg('Finalizando...');
          setShowCreateModal(false);
          setGoal('');
          setExamDate('');
          setMaxTopics('2');
          setSelectedFolderId(null);
          await loadData();
          setShowGeneratingModal(false);
          setShowSuccessModal(true);
      } catch (e: any) {
          Alert.alert('Erro', e.message);
      } finally {
          setLoading(false);
          setShowGeneratingModal(false);
      }
  }

  async function handleUpdatePlan(plan: any) {
      setActivePlan(plan);
      setShowOptionsModal(true);
  }
  
  async function onConfirmDelete() {
      if (!activePlan) return;
      setLoading(true);
      await deletePlan(activePlan.id);
      setShowDeleteConfirmModal(false);
      setShowOptionsModal(false);
      setActivePlan(null);
      await loadData();
      setLoading(false);
  }

  async function onUpdateEvents() {
      if (!activePlan) return;
      setLoading(true);
      await updatePlanEvents(activePlan.id);
      setShowOptionsModal(false);
      setActivePlan(null);
      await loadData();
      setLoading(false);
  }

  const markedDates = React.useMemo(() => {
      const marks: any = {};
      events.forEach(ev => {
          const date = ev.date.split('T')[0];
          if (!marks[date]) {
              marks[date] = { dots: [] };
          }
          // Add dot
          // Limit dots to 3 to avoid UI mess
          if (marks[date].dots.length < 3) {
              marks[date].dots.push({
                  key: ev.id,
                  color: ev.completed ? '#4CAF50' : tint, // Green if done, Tint if pending
              });
          }
      });
      
      // Highlight selected
      if (!marks[selectedDate]) marks[selectedDate] = {};
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = tint;
      
      return marks;
  }, [events, selectedDate, tint]);

  const dayEvents = events.filter(e => e.date.startsWith(selectedDate));

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
          <ThemedText type="title">Cronograma</ThemedText>
          <Pressable onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add-circle" size={32} color={tint} />
          </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }}>
          {/* Lista de Concursos/Planos Ativos (Horizontal) */}
          {plans.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 60 }}>
                  {plans.map(plan => (
                      <Pressable 
                        key={plan.id} 
                        style={[styles.planChip, { borderColor: border, backgroundColor: surface }]}
                        onPress={() => handleUpdatePlan(plan)}
                      >
                          <ThemedText type="defaultSemiBold">{plan.goal}</ThemedText>
                          <ThemedText style={{ fontSize: 10, opacity: 0.7 }}>
                              Data da prova: {format(parseISO(plan.exam_date), 'dd/MM/yy')}
                          </ThemedText>
                      </Pressable>
                  ))}
              </ScrollView>
          )}

          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: tint,
                selectedDayTextColor: '#ffffff',
                todayTextColor: tint,
                dayTextColor: text,
                textDisabledColor: '#d9e1e8',
                dotColor: tint,
                selectedDotColor: '#ffffff',
                arrowColor: tint,
                monthTextColor: text,
                indicatorColor: tint,
            }}
          />

          <View style={styles.dayList}>
              <ThemedText type="subtitle" style={{ marginTop: 16, marginBottom: 8 }}>
                  Para estudar em {format(parseISO(selectedDate), 'dd/MM', { locale: ptBR })}
              </ThemedText>
              
              {dayEvents.length === 0 ? (
                  <ThemedText style={{ opacity: 0.6, textAlign: 'center', marginTop: 20 }}>Nenhum estudo agendado.</ThemedText>
              ) : (
                  dayEvents.map(ev => (
                      <Pressable 
                          key={ev.id} 
                          style={[styles.eventCard, { borderColor: border, backgroundColor: surface }]}
                          onPress={() => {
                              // Navigate to category/folder
                              if (ev.category_id) {
                                  router.push({ pathname: '/category', params: { id: String(ev.category_id), name: ev.category_name } });
                              }
                          }}
                      >
                          <View style={{ flex: 1 }}>
                             <ThemedText type="defaultSemiBold">{ev.category_name || 'Tópico Geral'}</ThemedText>
                             <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                                {plans.find(p => p.id === ev.plan_id)?.goal}
                             </ThemedText>
                          </View>
                          <Pressable 
                            onPress={async (e) => {
                                e.stopPropagation();
                                await toggleEvent(ev.id, !ev.completed);
                                await loadData();
                            }}
                          >
                              <Ionicons 
                                name={ev.completed ? "checkbox" : "square-outline"} 
                                size={24} 
                                color={ev.completed ? "#4CAF50" : tint} 
                              />
                          </Pressable>
                      </Pressable>
                  ))
              )}
          </View>
      </ScrollView>

      {/* Modal de Criação */}
      <Modal visible={showCreateModal} animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
         <ThemedView style={styles.modalContainer}>
             <ScrollView contentContainerStyle={{ padding: 20 }}>
                 <ThemedText type="title" style={{ marginBottom: 20 }}>Novo Cronograma</ThemedText>

                 <ThemedText type="defaultSemiBold">Pasta de Conteúdo</ThemedText>
                 <ScrollView horizontal style={{ marginVertical: 10 }}>
                     {folders.map(f => (
                         <Pressable
                             key={f.id}
                             style={[
                                 styles.folderOption, 
                                 { borderColor: selectedFolderId === f.id ? tint : border, backgroundColor: selectedFolderId === f.id ? tint + '20' : 'transparent' }
                             ]}
                             onPress={() => setSelectedFolderId(f.id)}
                         >
                             <ThemedText>{f.name}</ThemedText>
                         </Pressable>
                     ))}
                 </ScrollView>

                 <ThemedText type="defaultSemiBold">Objetivo (Ex: Concurso PM)</ThemedText>
                 <ThemedTextInput value={goal} onChangeText={setGoal} placeholder="Nome do objetivo" style={styles.input} />

                 <ThemedText type="defaultSemiBold">Data da Prova (DD/MM/AAAA)</ThemedText>
                 <ThemedTextInput
                   value={examDate}
                   onChangeText={(t) => {
                     const prevDigits = examDate.replace(/\D/g, '');
                     const tDigits = String(t || '').replace(/\D/g, '');
                     let nextDigits = tDigits;
                     if (t.length < examDate.length) {
                       // backspace: remove último dígito
                       nextDigits = prevDigits.slice(0, -1);
                     } else if (tDigits.length > prevDigits.length) {
                       // adicionou um novo dígito
                       nextDigits = prevDigits + tDigits.slice(-1);
                     } // caso contrário, mantém tDigits
                     setExamDate(maskDateInput(nextDigits));
                   }}
                   placeholder="31/12/2025"
                   keyboardType="number-pad"
                   style={styles.input}
                   maxLength={10}
                 />

                 <ThemedText type="defaultSemiBold">Minutos por dia</ThemedText>
                 <ThemedTextInput value={dailyMinutes} onChangeText={setDailyMinutes} keyboardType="numeric" style={styles.input} />

                 <ThemedText type="defaultSemiBold">Máximo de matérias por dia</ThemedText>
                 <ThemedTextInput value={maxTopics} onChangeText={setMaxTopics} keyboardType="numeric" placeholder="2" style={styles.input} />

                 <ThemedText type="defaultSemiBold">Dias de Estudo</ThemedText>
                 <View style={styles.daysRow}>
                     {weekDays.map((day, idx) => {
                         const isSelected = selectedDays.includes(idx);
                         return (
                             <Pressable
                                key={idx}
                                style={[styles.dayCircle, { backgroundColor: isSelected ? tint : 'transparent', borderColor: isSelected ? tint : border }]}
                                onPress={() => {
                                    if (isSelected) setSelectedDays(prev => prev.filter(d => d !== idx));
                                    else setSelectedDays(prev => [...prev, idx]);
                                }}
                             >
                                 <ThemedText style={{ color: isSelected ? '#fff' : text, fontSize: 12 }}>{day}</ThemedText>
                             </Pressable>
                         );
                     })}
                 </View>

                 <View style={{ marginTop: 30, gap: 10 }}>
                     <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={handleCreatePlan}>
                         <ThemedText style={{ color: '#fff', textAlign: 'center' }}>Criar Cronograma</ThemedText>
                     </Pressable>
                     <Pressable style={styles.btn} onPress={() => setShowCreateModal(false)}>
                         <ThemedText style={{ textAlign: 'center' }}>Cancelar</ThemedText>
                     </Pressable>
                 </View>
             </ScrollView>
         </ThemedView>
      </Modal>

      {/* Modal de Progresso - Criando Cronograma */}
      <Modal visible={showGeneratingModal} transparent animationType="fade" onRequestClose={() => setShowGeneratingModal(false)}>
          <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { alignItems: 'center', gap: 12, backgroundColor: surface, borderColor: border }]}>
                  <ActivityIndicator />
                  <ThemedText>{generatingMsg}</ThemedText>
                  <ThemedText style={{ opacity: 0.7, fontSize: 12, textAlign: 'center' }}>
                      Distribuindo matérias... isso pode levar alguns segundos.
                  </ThemedText>
              </View>
          </View>
      </Modal>

      {/* Modal de Opções */}
      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
          <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
                  <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 16 }}>
                      Opções do Cronograma
                  </ThemedText>
                  
                  <Pressable 
                    style={[styles.modalBtn, { borderBottomWidth: 1, borderColor: border }]}
                    onPress={onUpdateEvents}
                  >
                      <Ionicons name="refresh" size={20} color={tint} />
                      <ThemedText>Atualizar Eventos</ThemedText>
                  </Pressable>

                  <Pressable 
                    style={[styles.modalBtn, { borderBottomWidth: 1, borderColor: border }]}
                    onPress={() => { setShowOptionsModal(false); setShowDeleteConfirmModal(true); }}
                  >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                      <ThemedText style={{ color: '#F44336' }}>Excluir Cronograma</ThemedText>
                  </Pressable>
                  
                  <Pressable 
                    style={[styles.modalBtn]}
                    onPress={() => setShowOptionsModal(false)}
                  >
                      <ThemedText style={{ opacity: 0.7 }}>Cancelar</ThemedText>
                  </Pressable>
              </View>
          </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal visible={showDeleteConfirmModal} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirmModal(false)}>
          <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <Ionicons name="warning" size={48} color="#F44336" />
                  </View>
                  <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 8 }}>
                      Excluir Cronograma?
                  </ThemedText>
                  <ThemedText style={{ textAlign: 'center', marginBottom: 24, opacity: 0.7 }}>
                      Todo o histórico de estudos será perdido permanentemente.
                  </ThemedText>
                  
                  <View style={{ gap: 12 }}>
                    <Pressable 
                        style={[styles.btn, { backgroundColor: '#F44336', paddingVertical: 12 }]}
                        onPress={onConfirmDelete}
                    >
                        <ThemedText style={{ color: '#fff', textAlign: 'center' }}>Sim, Excluir</ThemedText>
                    </Pressable>

                    <Pressable 
                        style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: border, paddingVertical: 12 }]}
                        onPress={() => setShowDeleteConfirmModal(false)}
                    >
                        <ThemedText style={{ textAlign: 'center' }}>Cancelar</ThemedText>
                    </Pressable>
                  </View>
              </View>
          </View>
      </Modal>

      {/* Modal de Sucesso */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
          <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                  </View>
                  <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 8 }}>
                      Cronograma Criado!
                  </ThemedText>
                  <ThemedText style={{ textAlign: 'center', marginBottom: 24, opacity: 0.7 }}>
                      Bons estudos! O plano foi gerado e as matérias distribuídas.
                  </ThemedText>
                  
                  <Pressable 
                      style={[styles.btn, { backgroundColor: tint, paddingVertical: 12 }]}
                      onPress={() => setShowSuccessModal(false)}
                  >
                      <ThemedText style={{ color: '#fff', textAlign: 'center' }}>Entendido</ThemedText>
                  </Pressable>
              </View>
          </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginBottom: 50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      marginRight: 8,
      justifyContent: 'center'
  },
  eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
      gap: 12
  },
  dayList: {
      paddingBottom: 20
  },
  modalContainer: {
      flex: 1,
  },
  input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      padding: 10,
      marginTop: 6,
      marginBottom: 16,
  },
  folderOption: {
      padding: 10,
      borderWidth: 1,
      borderRadius: 8,
      marginRight: 8,
  },
  daysRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8
  },
  dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center'
  },
  btn: {
      padding: 14,
      borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  }
});
