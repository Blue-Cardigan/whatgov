import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPostcode, insertPostcodeSpace, UK_POSTCODE_REGEX } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ChartBarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { lookupPostcode } from "@/lib/supabase/mpsearch";

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
  role: string;
};

interface StepsProps {
  step: number;
  formData: FormData;
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void;
}

export default function Steps({
  step,
  formData,
  setFormData,
}: StepsProps) {
  switch (step) {
    case 1:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-3xl font-semibold mb-3">What&apos;s your email?</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              We&apos;ll use this to sign you in
            </p>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Email address"
              className="text-lg py-6"
              required
              autoFocus
            />
          </div>
        </motion.div>
      );

    case 2:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-3xl font-semibold mb-3">Create a password</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Make it strong and memorable
            </p>
            <div className="space-y-4">
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Password"
                className="text-lg py-6"
                required
                autoComplete="new-password"
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword || ''}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm password"
                className="text-lg py-6"
                required
                autoComplete="new-password"
              />
            </div>
          </div>
        </motion.div>
      );

    case 3:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-3xl font-semibold mb-3">Tell us about yourself</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Optional information to help us understand our users better
            </p>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Organization (optional)</label>
                <Input
                  id="organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({...formData, organization: e.target.value})}
                  placeholder="Where do you work?"
                  className="text-lg py-6"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role (optional)</label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  placeholder="What do you do?"
                  className="text-lg py-6"
                />
              </div>
            </div>
          </div>
        </motion.div>
      );
  }
}