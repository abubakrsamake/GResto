interface LoadingScreenProps {
  label?: string;
}

export default function LoadingScreen({ label = 'Chargement...' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white font-bold">
      {label}
    </div>
  );
}
