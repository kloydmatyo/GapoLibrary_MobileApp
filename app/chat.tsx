import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { icon: '📚', label: 'My Books',   query: 'What books do I currently have borrowed?' },
  { icon: '📅', label: 'Due Dates',  query: 'When are my books due?' },
  { icon: '🔍', label: 'Find Books', query: 'Help me find books to read' },
  { icon: '🎉', label: 'Events',     query: 'What events are coming up?' },
];

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const listRef = useRef<FlatList>(null);

  // Initial greeting
  useEffect(() => {
    const greeting = user?.name
      ? `Hi ${user.name.split(' ')[0]}! 👋 I'm your GAPO Library Assistant. How can I help you today?`
      : `Hi there! 👋 I'm your GAPO Library Assistant. How can I help you today?`;
    setMessages([{ id: '0', role: 'assistant', content: greeting, timestamp: new Date() }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(trimmed, history, sessionId || undefined);
      const data = res.data;

      if (data.sessionId && !sessionId) setSessionId(data.sessionId);

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: data.response, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color={Colors.brand} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const showQuickActions = messages.length <= 1 && !loading;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={18} color={Colors.brand} />
          </View>
          <View>
            <Text style={styles.headerTitle}>GAPO Assistant</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, loading && styles.statusDotLoading]} />
              <Text style={styles.statusText}>{loading ? 'Typing…' : 'Online'}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingIndicator}>
                <View style={styles.avatar}>
                  <Ionicons name="sparkles" size={16} color={Colors.brand} />
                </View>
                <View style={styles.bubbleAssistant}>
                  <ActivityIndicator size="small" color={Colors.brand} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick actions */}
        {showQuickActions && (
          <View style={styles.quickActionsWrap}>
            <Text style={styles.quickActionsLabel}>Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity key={a.label} style={styles.quickChip} onPress={() => send(a.query)}>
                  <Text style={styles.quickChipIcon}>{a.icon}</Text>
                  <Text style={styles.quickChipLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 2,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.brand },
  statusDotLoading: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 11, color: Colors.textSecond, fontWeight: '500' },
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.brandLight, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: Colors.brand,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: Colors.textPrimary },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12,
  },
  quickActionsWrap: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  quickActionsLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  quickActionsScroll: { gap: 8, paddingBottom: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickChipIcon: { fontSize: 16 },
  quickChipLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
    fontSize: 14, color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brand, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
