import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UseCreateMutationHookOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  onSuccessCallback?: (response: any) => void;
  onErrorCallback?: (error: any) => void;
  invalidateCacheKeyArray?: string[];
  query: string;
}

export const useCreateMutationHook = ({
  method = 'POST',
  onSuccessCallback = () => {},
  onErrorCallback = () => {},
  invalidateCacheKeyArray = [],
  query,
}: UseCreateMutationHookOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const config: any = {
        method,
        url: query,
      };

      if (method === 'GET' || method === 'DELETE') {
        config.params = data;
      } else {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    },
    onSuccess: (response) => {
      invalidateCacheKeyArray.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      onSuccessCallback(response);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'An error occurred';
      toast.error(errorMessage);
      onErrorCallback(error);
    },
  });
};

