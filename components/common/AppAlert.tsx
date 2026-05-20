// app/components/AppAlert.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Trash2,
  XCircle,
  Check,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'destructive';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  checkbox?: {
    label: string;
    onToggle: (checked: boolean) => void;
  };
}

interface AppAlertContextType {
  showAlert: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type?: AlertType,
    checkbox?: {
      label: string;
      onToggle: (checked: boolean) => void;
    }
  ) => void;
}

const AppAlertContext = createContext<AppAlertContextType>({
  showAlert: () => {},
});

export const useAppAlert = () => useContext(AppAlertContext);

const ICON_CONFIG: Record<AlertType, { icon: any; color: string; bgColor: string }> = {
  success: { icon: CheckCircle, color: '#22C55E', bgColor: '#DCFCE7' },
  error: { icon: XCircle, color: '#EF4444', bgColor: '#FEE2E2' },
  warning: { icon: AlertTriangle, color: '#F59E0B', bgColor: '#FEF3C7' },
  info: { icon: Info, color: '#3B82F6', bgColor: '#DBEAFE' },
  confirm: { icon: HelpCircle, color: '#8B5CF6', bgColor: '#EDE9FE' },
  destructive: { icon: Trash2, color: '#EF4444', bgColor: '#FEE2E2' },
};

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [alertCheckboxChecked, setAlertCheckboxChecked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      buttons?: AlertButton[],
      type?: AlertType,
      checkbox?: { label: string; onToggle: (checked: boolean) => void }
    ) => {
      // Auto-detect type from title/message if not provided
      let detectedType: AlertType = type || 'info';
      if (!type) {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('success') || titleLower.includes('added') || titleLower.includes('moved') || titleLower.includes('updated') || titleLower.includes('merged') || titleLower.includes("chef's kiss")) {
          detectedType = 'success';
        } else if (titleLower.includes('error') || titleLower.includes('failed')) {
          detectedType = 'error';
        } else if (titleLower.includes('warning') || titleLower.includes('permission') || titleLower.includes('required') || titleLower.includes('missing') || titleLower.includes('duplicate') || titleLower.includes('invalid')) {
          detectedType = 'warning';
        } else if (titleLower.includes('delete') || titleLower.includes('clear') || titleLower.includes('remove')) {
          detectedType = 'destructive';
        } else if (titleLower.includes('confirm') || titleLower.includes('timer') || titleLower.includes('finished')) {
          detectedType = 'confirm';
        }
      }
      // If buttons have destructive style, override type
      if (buttons?.some(b => b.style === 'destructive')) {
        detectedType = 'destructive';
      }

      setAlertCheckboxChecked(false);
      setConfig({ title, message, type: detectedType, buttons, checkbox });
      setVisible(true);
    },
    []
  );

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      overlayAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const dismiss = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setConfig(null);
        callback?.();
      });
    },
    [scaleAnim, overlayAnim]
  );

  const alertType = config?.type || 'info';
  const iconConfig = ICON_CONFIG[alertType];
  const IconComponent = iconConfig?.icon || Info;

  // Determine buttons to render
  const buttons = config?.buttons;
  const hasCancel = buttons?.some(b => b.style === 'cancel');
  const hasDestructive = buttons?.some(b => b.style === 'destructive');

  return (
    <AppAlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                ],
                opacity: scaleAnim,
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: iconConfig.bgColor }]}>
              <IconComponent size={28} color={iconConfig.color} strokeWidth={2.5} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{config?.title}</Text>

            {/* Message */}
            <Text style={styles.message}>{config?.message}</Text>

            {/* Optional Checkbox */}
            {config?.checkbox && (
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.8}
                onPress={() => {
                  const nextVal = !alertCheckboxChecked;
                  setAlertCheckboxChecked(nextVal);
                  config.checkbox?.onToggle(nextVal);
                }}
              >
                <View style={[styles.alertCheckbox, alertCheckboxChecked && styles.alertCheckboxChecked]}>
                  {alertCheckboxChecked && <Check color="white" size={12} strokeWidth={3} />}
                </View>
                <Text style={styles.checkboxLabel}>{config.checkbox.label}</Text>
              </TouchableOpacity>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons && buttons.length > 0 ? (
                <>
                  {/* Render action buttons (non-cancel) first */}
                  {buttons
                    .filter(b => b.style !== 'cancel')
                    .map((btn, index) => (
                      <TouchableOpacity
                        key={`action-${index}`}
                        style={[
                          styles.button,
                          btn.style === 'destructive' ? styles.destructiveButton : styles.primaryButton,
                        ]}
                        onPress={() => dismiss(btn.onPress)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            btn.style === 'destructive'
                              ? styles.destructiveButtonText
                              : styles.primaryButtonText,
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  {/* Render cancel buttons as outline */}
                  {buttons
                    .filter(b => b.style === 'cancel')
                    .map((btn, index) => (
                      <TouchableOpacity
                        key={`cancel-${index}`}
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => dismiss(btn.onPress)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </>
              ) : (
                /* Default single OK button */
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => dismiss()}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 64, 340),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#111827',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#6B7280',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
    width: '100%',
  },
  alertCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCheckboxChecked: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
});
