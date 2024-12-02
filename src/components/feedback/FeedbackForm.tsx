'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, ThumbsDown, Bug, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { toast } from '@/hooks/use-toast';

type FeedbackType = 'general' | 'bug' | 'feature' | 'praise' | 'improvement';

interface FeedbackTypeOption {
  value: FeedbackType;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface FeedbackData {
  user_id: string;
  feedback_type: FeedbackType;
  feedback_text: string;
  created_at: string;
  severity?: 'low' | 'medium' | 'high';
  contact_email?: string;
}

export function FeedbackForm() {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [emailError, setEmailError] = useState<string>('');

  const feedbackTypes: FeedbackTypeOption[] = [
    {
      value: 'general',
      label: 'General',
      icon: MessageSquare,
      description: 'General feedback or comments'
    },
    {
      value: 'bug',
      label: 'Bug Report',
      icon: Bug,
      description: 'Report something that isn\'t working'
    },
    {
      value: 'feature',
      label: 'Feature Request',
      icon: Lightbulb,
      description: 'Suggest a new feature'
    },
    {
      value: 'praise',
      label: 'Praise',
      icon: ThumbsUp,
      description: 'Tell us what you like'
    },
    {
      value: 'improvement',
      label: 'Improvement',
      icon: ThumbsDown,
      description: 'Tell us what could be better'
    }
  ];

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field, so empty is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setContactEmail(email);
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || feedback.length < 20) return;
    if (contactEmail && !validateEmail(contactEmail)) return;

    setIsSubmitting(true);
    try {
      const feedbackData: FeedbackData = {
        user_id: user?.id || '',
        feedback_type: feedbackType,
        feedback_text: feedback.trim(),
        created_at: new Date().toISOString(),
        contact_email: contactEmail || undefined,
        severity: feedbackType === 'bug' ? severity : undefined,
      };

      const { error } = await supabase
        .from('user_feedback')
        .insert([feedbackData]);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Thank you for your feedback!',
        description: 'We appreciate your input and will use it to improve our service.'
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Failed to submit feedback',
        description: 'Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ThumbsUp className="w-12 h-12 text-green-500" />
            <h2 className="text-2xl font-bold">Thank you for helping us improve!</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Your feedback has been recorded and will be reviewed by our team.
              {contactEmail && " We'll get back to you if we need any clarification."}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setFeedback('');
                setContactEmail('');
                setSeverity('medium');
              }}
            >
              Submit another feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Feedback</CardTitle>
        <CardDescription>
          Help us improve your experience by sharing your thoughts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label>What kind of feedback do you have?</Label>
            <RadioGroup
              value={feedbackType}
              onValueChange={(value: FeedbackType) => setFeedbackType(value)}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3"
            >
              {feedbackTypes.map(({ value, label, icon: Icon, description }) => (
                <Label
                  key={value}
                  htmlFor={value}
                  className={`
                    flex flex-col items-center justify-between rounded-md border-2 border-muted 
                    bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer
                    ${feedbackType === value ? 'border-primary' : ''}
                  `}
                >
                  <RadioGroupItem value={value} id={value} className="sr-only" />
                  <Icon className="mb-2 h-6 w-6" />
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {description}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Your feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Please provide specific details to help us understand your feedback better..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
              required
              minLength={20}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {feedback.length}/500 characters (minimum 20)
            </p>
          </div>

          {feedbackType === 'bug' && (
            <div className="space-y-2">
              <Label>Severity</Label>
              <RadioGroup
                value={severity}
                onValueChange={(value: 'low' | 'medium' | 'high') => setSeverity(value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="severity-low" />
                  <Label htmlFor="severity-low">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="severity-medium" />
                  <Label htmlFor="severity-medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="severity-high" />
                  <Label htmlFor="severity-high">High</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <input
                type="email"
                id="email"
                placeholder="For follow-up questions"
                value={contactEmail}
                onChange={handleEmailChange}
                className={`w-full px-3 py-2 border rounded-md ${
                  emailError ? 'border-red-500' : ''
                }`}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={Boolean(
              !feedback.trim() || 
              feedback.length < 20 || 
              isSubmitting || 
              (contactEmail && !validateEmail(contactEmail))
            )}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}