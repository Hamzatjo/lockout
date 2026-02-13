export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
};

export const MUSCLE_GROUP_ICONS: Record<MuscleGroup, string> = {
  chest: '🏋️',
  back: '💪',
  legs: '🦵',
  shoulders: '🤷',
  biceps: '💪',
  triceps: '💪',
  core: '🔥',
};

export const EXERCISES: Exercise[] = [
  { id: 'bench_press', name: 'Bench Press', muscleGroup: 'chest' },
  { id: 'incline_bench', name: 'Incline Bench Press', muscleGroup: 'chest' },
  { id: 'dumbbell_press', name: 'Dumbbell Press', muscleGroup: 'chest' },
  { id: 'incline_dumbbell_press', name: 'Incline Dumbbell Press', muscleGroup: 'chest' },
  { id: 'dips', name: 'Dips', muscleGroup: 'chest' },
  { id: 'cable_fly', name: 'Cable Fly', muscleGroup: 'chest' },
  { id: 'dumbbell_fly', name: 'Dumbbell Fly', muscleGroup: 'chest' },
  
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'back' },
  { id: 'barbell_row', name: 'Barbell Row', muscleGroup: 'back' },
  { id: 'pull_ups', name: 'Pull-ups', muscleGroup: 'back' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'back' },
  { id: 'seated_row', name: 'Seated Row', muscleGroup: 'back' },
  { id: 't_bar_row', name: 'T-Bar Row', muscleGroup: 'back' },
  { id: 'dumbbell_row', name: 'Dumbbell Row', muscleGroup: 'back' },
  { id: 'face_pull', name: 'Face Pull', muscleGroup: 'back' },
  
  { id: 'squat', name: 'Squat', muscleGroup: 'legs' },
  { id: 'leg_press', name: 'Leg Press', muscleGroup: 'legs' },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'legs' },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'legs' },
  { id: 'leg_curl', name: 'Leg Curl', muscleGroup: 'legs' },
  { id: 'leg_extension', name: 'Leg Extension', muscleGroup: 'legs' },
  { id: 'calf_raise', name: 'Calf Raise', muscleGroup: 'legs' },
  { id: 'hip_thrust', name: 'Hip Thrust', muscleGroup: 'legs' },
  { id: 'goblet_squat', name: 'Goblet Squat', muscleGroup: 'legs' },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', muscleGroup: 'legs' },
  
  { id: 'overhead_press', name: 'Overhead Press', muscleGroup: 'shoulders' },
  { id: 'lateral_raise', name: 'Lateral Raise', muscleGroup: 'shoulders' },
  { id: 'front_raise', name: 'Front Raise', muscleGroup: 'shoulders' },
  { id: 'arnold_press', name: 'Arnold Press', muscleGroup: 'shoulders' },
  { id: 'rear_delt_fly', name: 'Rear Delt Fly', muscleGroup: 'shoulders' },
  { id: 'upright_row', name: 'Upright Row', muscleGroup: 'shoulders' },
  
  { id: 'bicep_curl', name: 'Bicep Curl', muscleGroup: 'biceps' },
  { id: 'hammer_curl', name: 'Hammer Curl', muscleGroup: 'biceps' },
  { id: 'preacher_curl', name: 'Preacher Curl', muscleGroup: 'biceps' },
  { id: 'concentration_curl', name: 'Concentration Curl', muscleGroup: 'biceps' },
  { id: 'incline_curl', name: 'Incline Curl', muscleGroup: 'biceps' },
  { id: 'spider_curl', name: 'Spider Curl', muscleGroup: 'biceps' },
  
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'triceps' },
  { id: 'skull_crushers', name: 'Skull Crushers', muscleGroup: 'triceps' },
  { id: 'tricep_dip', name: 'Tricep Dip', muscleGroup: 'triceps' },
  { id: 'overhead_tricep_extension', name: 'Overhead Tricep Extension', muscleGroup: 'triceps' },
  { id: 'close_grip_bench', name: 'Close Grip Bench', muscleGroup: 'triceps' },
  { id: 'tricep_kickback', name: 'Tricep Kickback', muscleGroup: 'triceps' },
  
  { id: 'plank', name: 'Plank', muscleGroup: 'core' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', muscleGroup: 'core' },
  { id: 'cable_crunch', name: 'Cable Crunch', muscleGroup: 'core' },
  { id: 'russian_twist', name: 'Russian Twist', muscleGroup: 'core' },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscleGroup: 'core' },
  { id: 'leg_raise', name: 'Leg Raise', muscleGroup: 'core' },
  { id: 'mountain_climber', name: 'Mountain Climber', muscleGroup: 'core' },
];

export const getExercisesByMuscleGroup = (muscleGroup: MuscleGroup): Exercise[] => {
  return EXERCISES.filter(exercise => exercise.muscleGroup === muscleGroup);
};

export const getExerciseById = (id: string): Exercise | undefined => {
  return EXERCISES.find(exercise => exercise.id === id);
};

export const getExerciseName = (id: string): string => {
  return getExerciseById(id)?.name || id;
};

export const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'];
