import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { 
  Send, 
  Eye, 
  Edit, 
  Mail, 
  User, 
  Calendar, 
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Copy,
  Save,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Separator } from './ui/separator';
import { authHeader } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// Email template data
const emailTemplates = {
  termination: {
    subject: "Employment Termination Notice - [Employee Name]",
    template: `Dear [Employee Name],

We regret to inform you that your employment with [Company Name] will be terminated effective [Termination Date].

This decision has been made after careful consideration and is based on [Reason for Termination]. Despite our efforts to address these concerns through [Previous Actions Taken], we have not seen the necessary improvements.

Your final day of work will be [Last Work Day]. Please note the following:

FINAL PAY & BENEFITS:
• Your final paycheck will include compensation through your last day of work
• You will receive payment for any accrued, unused vacation time as per company policy
• Your health insurance benefits will continue through [Benefits End Date]
• Information regarding COBRA continuation coverage will be mailed to your home address

RETURN OF COMPANY PROPERTY:
Please ensure all company property is returned by [Return Date], including:
• Company laptop and accessories
• ID badge and access cards
• Any confidential company documents or materials

TRANSITION OF RESPONSIBILITIES:
• Please prepare a handover document for your current projects
• [Manager Name] will coordinate the transition of your responsibilities
• You may be contacted for clarification on ongoing work items

We appreciate the contributions you have made during your time with [Company Name]. We wish you success in your future endeavors.

If you have any questions regarding this termination or the information provided above, please contact [HR Contact Name] at [HR Contact Email] or [HR Contact Phone].

Sincerely,

[Manager Name]
[Manager Title]
[Company Name]

---
This communication is confidential and intended solely for the addressee.`
  },
  review: {
    subject: "Performance Review Scheduling - [Employee Name]",
    template: `Dear [Employee Name],

I hope this email finds you well. I am writing to schedule your upcoming performance review as part of our regular evaluation process.

REVIEW DETAILS:
• Review Period: [Review Period]
• Scheduled Date: [Review Date]
• Time: [Review Time]
• Location: [Meeting Location/Video Link]
• Duration: Approximately [Duration] minutes

PREPARATION REQUIREMENTS:
Please come prepared with the following:
• Self-assessment form (attached or available in the employee portal)
• List of key accomplishments from the review period
• Professional development goals for the upcoming period
• Any questions or concerns you'd like to discuss

AGENDA OVERVIEW:
During our meeting, we will discuss:
1. Performance against established goals and objectives
2. Key achievements and contributions
3. Areas for continued development and growth
4. Goal setting for the next review period
5. Career development opportunities
6. Any support or resources you may need

DOCUMENTS TO REVIEW:
Prior to our meeting, please review:
• Your job description and current responsibilities
• Goals set during your last review
• Any feedback received throughout the review period

If the scheduled time does not work for you, please let me know as soon as possible so we can arrange an alternative time that works for both of us.

I look forward to our discussion and to recognizing your contributions to the team. This is also an excellent opportunity for you to share your thoughts on how we can better support your professional growth.

If you have any questions before our meeting, please don't hesitate to reach out.

Best regards,

[Manager Name]
[Manager Title]
[Company Name]
[Manager Email]
[Manager Phone]

---
Please confirm your attendance by replying to this email.`
  }
};

// Mock employee data for the form
const employeeData = {
  name: "Sarah Johnson",
  id: "EMP001",
  email: "sarah.johnson@company.com",
  department: "Engineering",
  position: "Software Developer",
  manager: "David Chen",
  managerTitle: "Engineering Manager",
  managerEmail: "david.chen@company.com",
  avatar: "https://images.unsplash.com/photo-1494790108755-2616b2e7d55f?w=150&h=150&fit=crop&crop=face",
  lastWorkDay: "December 31, 2024",
  terminationDate: "December 31, 2024",
  reviewDate: "January 15, 2025",
  reviewTime: "2:00 PM",
  reviewPeriod: "Q4 2024"
};

export function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<'termination' | 'review'>('termination');
  const [emailContent, setEmailContent] = useState(emailTemplates[selectedTemplate].template);
  const [emailSubject, setEmailSubject] = useState(emailTemplates[selectedTemplate].subject);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(employeeData.email);
  const [ccEmails, setCcEmails] = useState('hr@company.com');
  const [isModified, setIsModified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sentSuccessModalOpen, setSentSuccessModalOpen] = useState(false);
  const [sentEmailInfo, setSentEmailInfo] = useState<{
    to: string;
    subject: string;
    messageId?: string;
    previewUrl?: string | false;
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Template variable replacements
  const replaceTemplateVariables = (text: string) => {
    const replacements = {
      '[Employee Name]': employeeData.name,
      '[Company Name]': 'TechCorp Solutions',
      '[Termination Date]': employeeData.terminationDate,
      '[Last Work Day]': employeeData.lastWorkDay,
      '[Reason for Termination]': 'consistent performance issues and failure to meet established objectives',
      '[Previous Actions Taken]': 'performance improvement plans, additional training, and regular check-ins',
      '[Benefits End Date]': 'January 31, 2025',
      '[Return Date]': employeeData.lastWorkDay,
      '[Manager Name]': employeeData.manager,
      '[Manager Title]': employeeData.managerTitle,
      '[HR Contact Name]': 'Jennifer Martinez',
      '[HR Contact Email]': 'jennifer.martinez@company.com',
      '[HR Contact Phone]': '(555) 123-4567',
      '[Review Period]': employeeData.reviewPeriod,
      '[Review Date]': employeeData.reviewDate,
      '[Review Time]': employeeData.reviewTime,
      '[Meeting Location/Video Link]': 'Conference Room B / Zoom Link: https://zoom.us/meeting123',
      '[Duration]': '60',
      '[Manager Email]': employeeData.managerEmail,
      '[Manager Phone]': '(555) 123-4568'
    };

    let processedText = text;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      processedText = processedText.replace(new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'g'), value);
    });

    return processedText;
  };

  const handleTemplateChange = (template: 'termination' | 'review') => {
    setSelectedTemplate(template);
    setEmailContent(emailTemplates[template].template);
    setEmailSubject(emailTemplates[template].subject);
    setIsModified(false);
  };

  const handleContentChange = (value: string) => {
    setEmailContent(value);
    setIsModified(true);
  };

  const handleSubjectChange = (value: string) => {
    setEmailSubject(value);
    setIsModified(true);
  };

  const resetToTemplate = () => {
    setEmailContent(emailTemplates[selectedTemplate].template);
    setEmailSubject(emailTemplates[selectedTemplate].subject);
    setIsModified(false);
  };

  const handleSendEmail = async () => {
    const finalSubject = replaceTemplateVariables(emailSubject);
    const finalBody = replaceTemplateVariables(emailContent);

    try {
      setIsSending(true);
      const res = await fetch(`${API_BASE}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({
          to: recipientEmail,
          cc: ccEmails || undefined,
          subject: finalSubject,
          body: finalBody,
          metadata: {
            template: selectedTemplate,
            employeeId: employeeData.id,
            employeeName: employeeData.name,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to dispatch email (${res.status})`);
      }

      const result = await res.json();
      setSendConfirmOpen(false);
      setSentEmailInfo({
        to: recipientEmail,
        subject: finalSubject,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
      });
      setSentSuccessModalOpen(true);
      setToast({
        type: 'success',
        message: `Email dispatched successfully to ${recipientEmail}!`,
      });
    } catch (err) {
      console.error('Error dispatching email:', err);
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to dispatch email',
      });
    } finally {
      setIsSending(false);
    }
  };

  const processedContent = replaceTemplateVariables(emailContent);
  const processedSubject = replaceTemplateVariables(emailSubject);

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
      <div>
        <h1 className="text-3xl">Email Templates</h1>
        <p className="text-muted-foreground">
          Review and send pre-written email templates for employee communications
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Employee Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employeeData.avatar} alt={employeeData.name} />
                <AvatarFallback>
                  {employeeData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{employeeData.name}</p>
                <p className="text-sm text-muted-foreground">{employeeData.id}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span>{employeeData.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span>{employeeData.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manager:</span>
                <span>{employeeData.manager}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="truncate">{employeeData.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Composer
                </CardTitle>
                <CardDescription>
                  Select and customize email templates for employee communications
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isModified && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    Modified
                  </Badge>
                )}
                <Badge 
                  variant={selectedTemplate === 'termination' ? 'destructive' : 'default'}
                >
                  {selectedTemplate === 'termination' ? 'Termination' : 'Review'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value: 'termination' | 'review') => handleTemplateChange(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termination">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Termination Notice
                    </div>
                  </SelectItem>
                  <SelectItem value="review">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Performance Review
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Recipients */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>CC</Label>
                <Input
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="hr@company.com, manager@company.com"
                />
              </div>
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={emailSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            {/* Email Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Content</Label>
                <div className="flex gap-2">
                  {isModified && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetToTemplate}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Reset to Template
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={emailContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Email content..."
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Template variables (e.g., [Employee Name], [Company Name]) will be automatically replaced when sent.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              <div className="flex gap-2">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Email Preview</DialogTitle>
                      <DialogDescription>
                        Preview of the email with all template variables replaced
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 overflow-y-auto">
                      {/* Email Headers */}
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="grid gap-2 text-sm">
                          <div className="flex">
                            <span className="w-12 font-semibold">To:</span>
                            <span>{recipientEmail}</span>
                          </div>
                          {ccEmails && (
                            <div className="flex">
                              <span className="w-12 font-semibold">CC:</span>
                              <span>{ccEmails}</span>
                            </div>
                          )}
                          <div className="flex">
                            <span className="w-12 font-semibold">Subject:</span>
                            <span>{processedSubject}</span>
                          </div>
                        </div>
                      </div>

                      {/* Email Content */}
                      <div className="border rounded-lg p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                          {processedContent}
                        </pre>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                        Close Preview
                      </Button>
                      <Button onClick={() => {
                        setPreviewOpen(false);
                        setSendConfirmOpen(true);
                      }}>
                        <Send className="h-4 w-4 mr-2" />
                        Proceed to Send
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      Approve & Send
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {selectedTemplate === 'termination' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        Confirm Email Send
                      </DialogTitle>
                      <DialogDescription>
                        You are about to send a {selectedTemplate} email to {employeeData.name}. 
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="text-sm space-y-1">
                          <p><span className="font-semibold">To:</span> {recipientEmail}</p>
                          {ccEmails && <p><span className="font-semibold">CC:</span> {ccEmails}</p>}
                          <p><span className="font-semibold">Subject:</span> {processedSubject}</p>
                          <p><span className="font-semibold">Template:</span> {selectedTemplate === 'termination' ? 'Termination Notice' : 'Performance Review'}</p>
                        </div>
                      </div>
                      
                      {selectedTemplate === 'termination' && (
                        <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
                          <p className="text-sm font-semibold text-red-700">Important Notice</p>
                          <p className="text-sm text-red-600">
                            This is a termination email. Please ensure all required approvals have been obtained 
                            and proper procedures have been followed before sending.
                          </p>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSendConfirmOpen(false)} disabled={isSending}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSendEmail}
                        disabled={isSending}
                        variant={selectedTemplate === 'termination' ? 'destructive' : 'default'}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {isSending ? 'Sending Email...' : 'Confirm & Send Email'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Variables Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Template Variables Reference</CardTitle>
          <CardDescription>
            Available variables that will be automatically replaced in your email templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Employee Information</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>[Employee Name]</code> - {employeeData.name}</li>
                <li><code>[Company Name]</code> - TechCorp Solutions</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Termination Variables</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>[Termination Date]</code> - {employeeData.terminationDate}</li>
                <li><code>[Last Work Day]</code> - {employeeData.lastWorkDay}</li>
                <li><code>[Return Date]</code> - {employeeData.lastWorkDay}</li>
                <li><code>[Benefits End Date]</code> - January 31, 2025</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Review Variables</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>[Review Date]</code> - {employeeData.reviewDate}</li>
                <li><code>[Review Time]</code> - {employeeData.reviewTime}</li>
                <li><code>[Review Period]</code> - {employeeData.reviewPeriod}</li>
                <li><code>[Duration]</code> - 60 minutes</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Manager Information</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>[Manager Name]</code> - {employeeData.manager}</li>
                <li><code>[Manager Title]</code> - {employeeData.managerTitle}</li>
                <li><code>[Manager Email]</code> - {employeeData.managerEmail}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">HR Contact</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>[HR Contact Name]</code> - Jennifer Martinez</li>
                <li><code>[HR Contact Email]</code> - jennifer.martinez@company.com</li>
                <li><code>[HR Contact Phone]</code> - (555) 123-4567</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transmission Success Modal */}
      <Dialog open={sentSuccessModalOpen} onOpenChange={setSentSuccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Email Dispatched Successfully
            </DialogTitle>
            <DialogDescription>
              Your email communication has been processed and dispatched by the backend mail service.
            </DialogDescription>
          </DialogHeader>

          {sentEmailInfo && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p><span className="font-semibold">Recipient:</span> {sentEmailInfo.to}</p>
                <p><span className="font-semibold">Subject:</span> {sentEmailInfo.subject}</p>
                {sentEmailInfo.messageId && (
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Message ID:</span> {sentEmailInfo.messageId}</p>
                )}
              </div>

              {sentEmailInfo.previewUrl && (
                <div className="rounded-md border p-3 bg-blue-50/50">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Ethereal Sandbox Inbox</p>
                  <a
                    href={sentEmailInfo.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-mono break-all"
                  >
                    <span>View dispatched email preview</span>
                    <ExternalLink className="h-3 w-3 inline shrink-0" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSentSuccessModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}