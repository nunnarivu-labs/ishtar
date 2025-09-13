import type { File } from '@ishtar/commons/types';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase.ts';
import { fileConverter } from '../../converters/file-converter.ts';

export const fetchFileData = async ({
  currentUserUid,
  conversationId,
  fileId,
}: {
  currentUserUid: string;
  conversationId: string;
  fileId: string;
}): Promise<File> => {
  const ref = doc(
    firebaseApp.firestore,
    'users',
    currentUserUid,
    'conversations',
    conversationId,
    'files',
    fileId,
  ).withConverter(fileConverter);

  const fileDoc = await getDoc(ref);

  if (!fileDoc.exists()) {
    throw new Error(
      `File data with ID ${fileId} does not exist in conversation ${conversationId} for user ${currentUserUid}`,
    );
  }

  return fileDoc.data() as File;
};

export const persistFileData = async (
  {
    currentUserUid,
    conversationId,
  }: {
    currentUserUid: string;
    conversationId: string;
  },
  draftFileData: Omit<File, 'id'>,
): Promise<string> => {
  const newFileDataRef = await addDoc(
    collection(
      firebaseApp.firestore,
      'users',
      currentUserUid,
      'conversations',
      conversationId,
      'files',
    ).withConverter(fileConverter),
    draftFileData,
  );

  return newFileDataRef.id;
};
