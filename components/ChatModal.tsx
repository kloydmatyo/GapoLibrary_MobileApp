import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Modal, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sendChatMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { icon: '📚', label: 'My Books',   query: 'What books do I currently have borrowed?' },
  { icon: '📅', label: 'Due Dates',  query: 'When are my books due?' },
  { icon: '🔍', label: 'Find Books', query: 'Help me find books to read' },
  { icon: '🎉', label: 'Events',     query: 'What events are coming up?' },
];

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ChatModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const listRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  // Slide up/down animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Greeting on first open
  useEffect(() => {
    if (visible && messages.length === 0) {
      const name = user?.name?.split(' ')[0];
      setMessages([{
        id: '0', role: 'assistant',
        content: name
          ? `Hi ${name}! 👋 I'm your GAPO Library Assistant. How can I help you today?`
          : `Hi there! 👋 I'm your GAPO Library Assistant. How can I help you today?`,
      }]);
    }
  }, [visible]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(trimmed, history, sessionId || undefined);
      if (res.data.sessionId && !sessionId) setSessionId(res.data.sessionId);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: res.data.response,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <LinearGradient colors={['#2e7d32', '#15803d']} style={styles.botAvatar}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </LinearGradient>
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
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header */}
        <LinearGradient colors={['#2e7d32', '#16a34a']} style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>GAPO Assistant</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, loading && styles.statusDotLoading]} />
                <Text style={styles.statusText}>{loading ? 'Typing…' : 'Online'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </LinearGradient>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={loading ? (
              <View style={styles.msgRowAssistant}>
                <LinearGradient colors={['#2e7d32', '#15803d']} style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                </LinearGradient>
                <View style={styles.bubbleAssistant}>
                  <ActivityIndicator size="small" color={Colors.brand} />
                </View>
              </View>
            ) : null}
          />

          {/* Quick actions */}
          {showQuickActions && (
            <View style={styles.quickWrap}>
              <Text style={styles.quickLabel}>QUICK ACTIONS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
                {QUICK_ACTIONS.map(a => (
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
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SCREEN_H * 0.82,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac' },
  statusDotLoading: { backgroundColor: '#fde68a' },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },

  // Messages
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleUser: { backgroundColor: Colors.brandDarker, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: Colors.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff', fontWeight: '500' },
  bubbleTextAssistant: { color: Colors.textPrimary },

  // Quick actions
  quickWrap: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  quickLabel: {
    fontSize: 10, fontWeight: '800', color: Colors.textMuted,
    letterSpacing: 0.8, marginBottom: 8,
  },
  quickScroll: { gap: 8, paddingBottom: 4 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickChipIcon: { fontSize: 15 },
  quickChipLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    fontSize: 14, color: Colors.textPrimary, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.brandDarker, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  sendBtnDisabled: { opacity: 0.4 },
});
