import { StyleSheet } from 'react-native';

import { Text, type TextProps } from '../../components/Text';
import { splitLink } from '../intro/link-text';

export type LinkedSentenceProps = Omit<TextProps, 'children' | 'onPress'> & {
  /** A translated sentence with one `<link>…</link>` span. */
  text: string;
  onPressLink: () => void;
  linkTestID?: string;
};

/** A sentence with one tappable span, wherever the translator put it (features/intro/link-text). */
export function LinkedSentence({ text, onPressLink, linkTestID, ...rest }: LinkedSentenceProps) {
  const { before, link, after } = splitLink(text);
  return (
    <Text {...rest}>
      {before}
      {link ? (
        <Text
          testID={linkTestID}
          variant={rest.variant}
          color="sageDeep"
          accessibilityRole="link"
          onPress={onPressLink}
          style={styles.link}
        >
          {link}
        </Text>
      ) : null}
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
});
