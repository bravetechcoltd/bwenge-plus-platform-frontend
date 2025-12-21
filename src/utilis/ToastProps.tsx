/* eslint-disable react-refresh/only-export-components */
import { ToastContainerProps, ToastOptions, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastProps: ToastContainerProps = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  newestOnTop: false,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
};

const customToastOptionError: ToastOptions = {
  className: 'bg-white-400 text-black p-4 rounded shadow-lg text-sm',
};

const customToastOptionSuccess: ToastOptions = {
  className: 'bg-white-400 text-gree p-4 rounded shadow-lg text-sm',
};

const customToastOptionInfo: ToastOptions = {
  className: 'bg-blue-400 text-white p-4 rounded shadow-lg text-sm',
};

export const showSuccessToast = (message: string, options?: ToastOptions) => {
  toast.success(message, { ...customToastOptionSuccess, ...options });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  toast.error(message, { ...customToastOptionError, ...options });
};

export const showInfoToast = (message: string, options?: ToastOptions) => {
  toast.info(message, { ...customToastOptionInfo, ...options });
};

export default ToastProps;
