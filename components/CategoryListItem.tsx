import React from 'react';
import { View, StyleSheet, Button, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';

type Props = {
  id: number;
  name: string;
  onDelete?: (id: number) => void;
};

export function CategoryListItem({ id, name, onDelete }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.linkArea}
        onPress={() => router.push({ pathname: `/categories/${id}` as any, params: { id: String(id), name } })}
      >
        <ThemedText type="defaultSemiBold">{name}</ThemedText>
      </Pressable>
      {onDelete ? <Button title="Excluir" onPress={() => onDelete(id)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  linkArea: {
    flex: 1,
  },
});


