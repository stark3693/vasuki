import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Plus, X, Calendar, Clock } from 'lucide-react';
import { usePolls } from '../../hooks/use-polls';
import { useWalletWeb3 } from '../../hooks/use-wallet-web3';
import { toast } from '../../hooks/use-toast';
import { WalletGatedInteraction } from './wallet-gated-interaction';

const pollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required').max(10, 'Maximum 10 options allowed'),
  deadline: z.string().min(1, 'Deadline is required'),
});

type PollFormData = z.infer<typeof pollSchema>;

interface PollCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PollCreationForm({ onSuccess, onCancel }: PollCreationFormProps) {
  const { createPoll, isCreating } = usePolls();
  const { isConnected } = useWalletWeb3();
  const [options, setOptions] = useState(['', '']);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: '',
      description: '',
      options: ['', ''],
      deadline: '',
    },
  });


  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      setValue('options', newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    setValue('options', newOptions);
  };

  const onSubmit = async (data: PollFormData) => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to create a poll.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const deadline = Math.floor(new Date(data.deadline).getTime() / 1000);
      
      if (deadline <= Math.floor(Date.now() / 1000)) {
        toast({
          title: 'Invalid Deadline',
          description: 'Deadline must be in the future.',
          variant: 'destructive',
        });
        return;
      }

      createPoll({
        title: data.title,
        description: data.description,
        options: data.options.filter(option => option.trim() !== ''),
        deadline,
        isStakingEnabled: false,
      });

      toast({
        title: 'Poll Created',
        description: 'Your prediction poll has been created successfully!',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Error',
        description: 'Failed to create poll. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isConnected) {
    return (
      <WalletGatedInteraction 
        action="create"
        fallbackMessage="You need to connect your wallet to create prediction polls."
        onConnect={onCancel}
      >
        <div />
      </WalletGatedInteraction>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          Create Prediction Poll
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Create a new prediction poll for the community to vote on.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              placeholder="What will happen next?"
              {...register('title')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide more details about your prediction..."
              rows={3}
              {...register('description')}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm sm:text-base">Poll Options *</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className={`text-sm sm:text-base ${errors.options?.[index] ? 'border-red-500' : ''}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
            {errors.options && (
              <p className="text-sm text-red-500">{errors.options.message}</p>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline *</Label>
            <div className="relative">
              <Input
                id="deadline"
                type="datetime-local"
                {...register('deadline')}
                className={errors.deadline ? 'border-red-500' : ''}
                min={new Date().toISOString().slice(0, 16)}
              />
              <Clock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.deadline && (
              <p className="text-sm text-red-500">{errors.deadline.message}</p>
            )}
          </div>


          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-10 sm:h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="flex-1 h-10 sm:h-11"
            >
              {isCreating ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
