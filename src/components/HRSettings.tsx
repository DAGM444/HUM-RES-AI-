import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Separator } from './ui/separator';
import { 
  Settings, 
  Target, 
  Calculator, 
  Bell, 
  Users, 
  Shield,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Mail,
  Smartphone,
  Globe,
  Lock,
  User,
  UserCheck,
  UserX,
  Eye,
  Edit3,
  Loader2,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { authHeader } from '../lib/auth';
import { useTheme } from '../lib/theme';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Mock settings data
const initialSettings = {
  performance: {
    excellentThreshold: 90,
    goodThreshold: 75,
    satisfactoryThreshold: 60,
    reviewCycleMonths: 6,
    probationPeriodDays: 90,
    terminationThreshold: 40,
    consecutiveMonthsForAction: 3
  },
  scoring: {
    attendanceWeight: 30,
    tasksWeight: 40,
    behaviorWeight: 30,
    attendanceDeductionPerAbsence: 5,
    taskCompletionBonus: 10,
    behaviorIncidentDeduction: 15,
    maximumScore: 100,
    minimumScore: 0
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    performanceAlerts: true,
    terminationAlerts: true,
    reviewReminders: true,
    dailyDigest: true,
    weeklyReports: true,
    notificationFrequency: 'immediate',
    digestTime: '09:00'
  },
  permissions: {
    hrManagers: {
      viewAllEmployees: true,
      editPerformance: true,
      initiateTermination: true,
      approveTermination: false,
      accessReports: true,
      manageUsers: false
    },
    hrDirectors: {
      viewAllEmployees: true,
      editPerformance: true,
      initiateTermination: true,
      approveTermination: true,
      accessReports: true,
      manageUsers: true
    },
    supervisors: {
      viewAllEmployees: false,
      editPerformance: true,
      initiateTermination: false,
      approveTermination: false,
      accessReports: false,
      manageUsers: false
    }
  },
  general: {
    companyName: 'Acme Corporation',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    language: 'English',
    workingDays: 5,
    workingHoursPerDay: 8,
    fiscalYearStart: 'January'
  }
};

interface HRSettingsProps {
  onNavigateToProfile?: () => void;
}

export function HRSettings({ onNavigateToProfile }: HRSettingsProps) {
  const { theme, setTheme, isDark } = useTheme();
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('performance');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch settings from GET /api/settings on mount
  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/api/settings`, {
          headers: {
            ...authHeader(),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setSettings(data);
            setSavedSettings(data);
            setHasChanges(false);
          }
        } else {
          console.error('Failed to load settings from server:', res.statusText);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updatePermission = (role: string, permission: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: {
          ...prev.permissions[role as keyof typeof prev.permissions],
          [permission]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save settings (${res.status})`);
      }

      const updated = await res.json();
      setSettings(updated);
      setSavedSettings(updated);
      setHasChanges(false);
      setToast({
        type: 'success',
        message: 'HR settings saved and persisted successfully!',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(savedSettings);
    setHasChanges(false);
    setToast({
      type: 'success',
      message: 'Settings reset to last saved values.',
    });
  };

  const renderPerformanceSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Performance Thresholds
          </CardTitle>
          <CardDescription>
            Configure performance rating thresholds and review cycles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="excellent-threshold">Excellent Threshold (%)</Label>
              <Input
                id="excellent-threshold"
                type="number"
                value={settings.performance.excellentThreshold}
                onChange={(e) => updateSetting('performance', 'excellentThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="good-threshold">Good Threshold (%)</Label>
              <Input
                id="good-threshold"
                type="number"
                value={settings.performance.goodThreshold}
                onChange={(e) => updateSetting('performance', 'goodThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="satisfactory-threshold">Satisfactory Threshold (%)</Label>
              <Input
                id="satisfactory-threshold"
                type="number"
                value={settings.performance.satisfactoryThreshold}
                onChange={(e) => updateSetting('performance', 'satisfactoryThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termination-threshold">Termination Threshold (%)</Label>
              <Input
                id="termination-threshold"
                type="number"
                value={settings.performance.terminationThreshold}
                onChange={(e) => updateSetting('performance', 'terminationThreshold', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Cycles & Periods</CardTitle>
          <CardDescription>
            Set review frequencies and probation periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="review-cycle">Review Cycle (Months)</Label>
              <Input
                id="review-cycle"
                type="number"
                value={settings.performance.reviewCycleMonths}
                onChange={(e) => updateSetting('performance', 'reviewCycleMonths', parseInt(e.target.value))}
                min="1"
                max="12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probation-period">Probation Period (Days)</Label>
              <Input
                id="probation-period"
                type="number"
                value={settings.performance.probationPeriodDays}
                onChange={(e) => updateSetting('performance', 'probationPeriodDays', parseInt(e.target.value))}
                min="30"
                max="365"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consecutive-months">Consecutive Poor Months for Action</Label>
              <Input
                id="consecutive-months"
                type="number"
                value={settings.performance.consecutiveMonthsForAction}
                onChange={(e) => updateSetting('performance', 'consecutiveMonthsForAction', parseInt(e.target.value))}
                min="1"
                max="12"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderScoringSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Scoring Weights
          </CardTitle>
          <CardDescription>
            Configure how different factors contribute to performance scores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-weight">Attendance Weight (%)</Label>
              <Input
                id="attendance-weight"
                type="number"
                value={settings.scoring.attendanceWeight}
                onChange={(e) => updateSetting('scoring', 'attendanceWeight', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tasks-weight">Tasks Weight (%)</Label>
              <Input
                id="tasks-weight"
                type="number"
                value={settings.scoring.tasksWeight}
                onChange={(e) => updateSetting('scoring', 'tasksWeight', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="behavior-weight">Behavior Weight (%)</Label>
              <Input
                id="behavior-weight"
                type="number"
                value={settings.scoring.behaviorWeight}
                onChange={(e) => updateSetting('scoring', 'behaviorWeight', parseInt(e.target.value))}
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Total weight: {settings.scoring.attendanceWeight + settings.scoring.tasksWeight + settings.scoring.behaviorWeight}%
              {settings.scoring.attendanceWeight + settings.scoring.tasksWeight + settings.scoring.behaviorWeight !== 100 && (
                <span className="text-red-600 ml-2">(Should equal 100%)</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Rules</CardTitle>
          <CardDescription>
            Define point deductions and bonuses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="absence-deduction">Deduction per Absence</Label>
              <Input
                id="absence-deduction"
                type="number"
                value={settings.scoring.attendanceDeductionPerAbsence}
                onChange={(e) => updateSetting('scoring', 'attendanceDeductionPerAbsence', parseInt(e.target.value))}
                min="0"
                max="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-bonus">Task Completion Bonus</Label>
              <Input
                id="task-bonus"
                type="number"
                value={settings.scoring.taskCompletionBonus}
                onChange={(e) => updateSetting('scoring', 'taskCompletionBonus', parseInt(e.target.value))}
                min="0"
                max="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="behavior-deduction">Behavior Incident Deduction</Label>
              <Input
                id="behavior-deduction"
                type="number"
                value={settings.scoring.behaviorIncidentDeduction}
                onChange={(e) => updateSetting('scoring', 'behaviorIncidentDeduction', parseInt(e.target.value))}
                min="0"
                max="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-score">Maximum Score</Label>
              <Input
                id="max-score"
                type="number"
                value={settings.scoring.maximumScore}
                onChange={(e) => updateSetting('scoring', 'maximumScore', parseInt(e.target.value))}
                min="100"
                max="200"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how and when notifications are sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.emailNotifications}
                onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-green-600" />
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.pushNotifications}
                onChange={(e) => updateSetting('notifications', 'pushNotifications', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Text message alerts for urgent items</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.smsNotifications}
                onChange={(e) => updateSetting('notifications', 'smsNotifications', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Performance Alerts</Label>
                <p className="text-sm text-muted-foreground">When employee performance drops</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.performanceAlerts}
                onChange={(e) => updateSetting('notifications', 'performanceAlerts', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Termination Alerts</Label>
                <p className="text-sm text-muted-foreground">When termination actions are needed</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.terminationAlerts}
                onChange={(e) => updateSetting('notifications', 'terminationAlerts', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Review Reminders</Label>
                <p className="text-sm text-muted-foreground">Upcoming performance reviews</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.reviewReminders}
                onChange={(e) => updateSetting('notifications', 'reviewReminders', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Digest</Label>
                <p className="text-sm text-muted-foreground">Summary of daily HR activities</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.dailyDigest}
                onChange={(e) => updateSetting('notifications', 'dailyDigest', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPermissionSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Role Permissions
          </CardTitle>
          <CardDescription>
            Configure what each role can access and modify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(settings.permissions).map(([role, permissions]) => (
            <div key={role} className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h4 className="capitalize">{role.replace(/([A-Z])/g, ' $1').trim()}</h4>
                <Badge variant="outline" className="ml-auto">
                  {Object.values(permissions).filter(Boolean).length} permissions
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-6">
                {Object.entries(permissions).map(([permission, value]) => (
                  <div key={permission} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {permission.includes('view') && <Eye className="h-3 w-3 text-blue-600" />}
                      {permission.includes('edit') && <Edit3 className="h-3 w-3 text-green-600" />}
                      {permission.includes('terminate') && <UserX className="h-3 w-3 text-red-600" />}
                      {permission.includes('approve') && <UserCheck className="h-3 w-3 text-purple-600" />}
                      {permission.includes('manage') && <Settings className="h-3 w-3 text-orange-600" />}
                      {permission.includes('access') && <Lock className="h-3 w-3 text-indigo-600" />}
                      <span className="text-sm capitalize">
                        {permission.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updatePermission(role, permission, e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                ))}
              </div>
              {role !== 'supervisors' && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Theme & Appearance Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Appearance &amp; Theme
          </CardTitle>
          <CardDescription>
            Customize your visual experience with modern light and dark themes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/30 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="h-6 w-6 text-amber-500" />
              <div className="text-center">
                <p className="text-sm font-medium">Light Mode</p>
                <p className="text-xs text-muted-foreground">Clean, polished palette</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/30 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="h-6 w-6 text-indigo-500" />
              <div className="text-center">
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Modern slate &amp; indigo</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                theme === 'system'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-600/30 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Laptop className="h-6 w-6 text-slate-500" />
              <div className="text-center">
                <p className="text-sm font-medium">System Preference</p>
                <p className="text-xs text-muted-foreground">Match OS (${isDark ? 'Dark' : 'Light'})</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Configuration
          </CardTitle>
          <CardDescription>
            Basic application and company settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={settings.general.companyName}
                onChange={(e) => updateSetting('general', 'companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={settings.general.timezone}
                onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <select
                id="date-format"
                value={settings.general.dateFormat}
                onChange={(e) => updateSetting('general', 'dateFormat', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={settings.general.currency}
                onChange={(e) => updateSetting('general', 'currency', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Schedule Settings</CardTitle>
          <CardDescription>
            Configure standard work schedules and fiscal year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="working-days">Working Days per Week</Label>
              <Input
                id="working-days"
                type="number"
                value={settings.general.workingDays}
                onChange={(e) => updateSetting('general', 'workingDays', parseInt(e.target.value))}
                min="1"
                max="7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="working-hours">Hours per Day</Label>
              <Input
                id="working-hours"
                type="number"
                value={settings.general.workingHoursPerDay}
                onChange={(e) => updateSetting('general', 'workingHoursPerDay', parseInt(e.target.value))}
                min="1"
                max="24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
              <select
                id="fiscal-year"
                value={settings.general.fiscalYearStart}
                onChange={(e) => updateSetting('general', 'fiscalYearStart', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="January">January</option>
                <option value="April">April</option>
                <option value="July">July</option>
                <option value="October">October</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1>HR Settings</h1>
            {isLoading && (
              <Badge variant="outline" className="flex items-center gap-1.5 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Configure performance thresholds, scoring rules, and system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Unsaved changes</span>
            </div>
          )}
          <Button variant="outline" onClick={resetSettings} disabled={!hasChanges || isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Scoring
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {renderPerformanceSettings()}
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4">
          {renderScoringSettings()}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          {renderNotificationSettings()}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {renderPermissionSettings()}
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          {renderGeneralSettings()}
        </TabsContent>
      </Tabs>

      {/* Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Current Configuration Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Performance</p>
              <p className="text-muted-foreground">
                Excellent: {settings.performance.excellentThreshold}%+
              </p>
              <p className="text-muted-foreground">
                Review cycle: {settings.performance.reviewCycleMonths} months
              </p>
            </div>
            <div>
              <p className="font-medium">Scoring</p>
              <p className="text-muted-foreground">
                Tasks: {settings.scoring.tasksWeight}%
              </p>
              <p className="text-muted-foreground">
                Attendance: {settings.scoring.attendanceWeight}%
              </p>
            </div>
            <div>
              <p className="font-medium">Notifications</p>
              <p className="text-muted-foreground">
                Email: {settings.notifications.emailNotifications ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-muted-foreground">
                Push: {settings.notifications.pushNotifications ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="font-medium">General</p>
              <p className="text-muted-foreground">
                {settings.general.companyName}
              </p>
              <p className="text-muted-foreground">
                {settings.general.workingDays} days/week
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}