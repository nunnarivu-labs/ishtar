import type { FileData } from '@ishtar/commons';
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
}): Promise<FileData> => {
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

  return fileDoc.data() as FileData;
};

export const persistFileData = async (
  {
    currentUserUid,
    conversationId,
  }: {
    currentUserUid: string;
    conversationId: string;
  },
  draftFileData: Omit<FileData, 'id'>,
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
